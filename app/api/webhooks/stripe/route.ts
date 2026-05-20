// POST /api/webhooks/stripe
// Verifies the Stripe signature, then dispatches to event handlers that
// keep our local DB in sync with Stripe's source of truth.
//
// Events handled (per Phase 3 spec):
//   - checkout.session.completed      → upgrade plan, store subscription
//   - customer.subscription.updated   → sync status + period bounds + plan
//   - customer.subscription.deleted   → downgrade to FREE, mark cancelled
//   - invoice.payment_failed          → flag account (status PAST_DUE)
//
// Signature verification REQUIRES the raw request body, which is why we
// call request.text() not request.json(). Next.js App Router preserves
// the raw body when you use .text() — no extra config needed.
//
// The actual sync logic lives in lib/stripe/subscription-sync.ts so the
// recovery script (scripts/stripe-sync-user.ts) can reuse it.
import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import {
  applySubscriptionToUser,
  downgradeSubscription,
  findUserIdFromCustomer,
  findUserIdInSubscriptionMetadata,
} from "@/lib/stripe/subscription-sync";

export const runtime = "nodejs";

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const userId = session.metadata?.app_user_id;
  if (!userId) {
    console.warn("checkout.session.completed missing app_user_id metadata");
    return;
  }
  if (!session.subscription || typeof session.subscription !== "string") {
    console.warn("checkout.session.completed not a subscription session");
    return;
  }
  const sub = await stripe.subscriptions.retrieve(session.subscription);
  await applySubscriptionToUser(userId, sub);
}

async function handleSubscriptionUpdated(
  sub: Stripe.Subscription,
): Promise<void> {
  let userId = findUserIdInSubscriptionMetadata(sub);
  if (!userId) userId = await findUserIdFromCustomer(sub.customer);
  if (!userId) {
    console.warn(
      `customer.subscription.updated could not resolve user for sub ${sub.id}`,
    );
    return;
  }
  await applySubscriptionToUser(userId, sub);
}

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
): Promise<void> {
  // Modern Stripe invoices reference subscriptions via lines, not a top-level
  // `subscription` field. Pull the first subscription-typed line.
  const subId =
    typeof (invoice as unknown as { subscription?: string | null })
      .subscription === "string"
      ? ((invoice as unknown as { subscription?: string }).subscription ?? null)
      : (invoice.lines?.data?.find((l) => {
          const parent = (l as unknown as { parent?: { type?: string } })
            .parent;
          return parent?.type === "subscription_item_details";
        })?.subscription ?? null);

  if (!subId || typeof subId !== "string") {
    console.warn("invoice.payment_failed has no subscription reference");
    return;
  }
  await db.subscription.updateMany({
    where: { stripeSubscriptionId: subId },
    data: { status: "PAST_DUE" },
  });
}

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      {
        error:
          "STRIPE_WEBHOOK_SECRET is not configured. Run `stripe listen` in dev or create a webhook endpoint in production.",
      },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, secret);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${msg}` },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpdated(event.data.object);
        break;
      case "customer.subscription.deleted":
        await downgradeSubscription(event.data.object);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object);
        break;
      default:
        // Ignore unhandled events.
        console.log(`stripe webhook ignored: ${event.type}`);
    }
  } catch (err) {
    console.error(`stripe webhook handler failed for ${event.type}:`, err);
    // Return 500 so Stripe retries (idempotent handlers above can be re-run).
    return NextResponse.json(
      { error: "Handler error; will retry" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
