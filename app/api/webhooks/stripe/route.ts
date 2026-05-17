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
import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { planFromLookupKey } from "@/lib/plans";
import type { SubscriptionStatus, Plan } from "@prisma/client";

export const runtime = "nodejs";

function mapStripeStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIALING";
    case "past_due":
    case "unpaid":
      return "PAST_DUE";
    case "canceled":
    case "incomplete_expired":
      return "CANCELLED";
    case "incomplete":
    case "paused":
      // Treat as past_due until it resolves; closest semantic match.
      return "PAST_DUE";
    default:
      return "PAST_DUE";
  }
}

async function getPlanFromSubscription(sub: Stripe.Subscription): Promise<Plan> {
  const item = sub.items.data[0];
  const lookupKey = item?.price.lookup_key;
  if (lookupKey) return planFromLookupKey(lookupKey);

  // Fallback: fetch the price to read its lookup_key (some webhook payloads
  // don't include it inline).
  if (item?.price.id) {
    const price = await stripe.prices.retrieve(item.price.id);
    return planFromLookupKey(price.lookup_key);
  }
  return "FREE";
}

function findUserIdInSubscriptionMetadata(
  sub: Stripe.Subscription,
): string | null {
  const meta = sub.metadata;
  if (meta && typeof meta.app_user_id === "string") return meta.app_user_id;
  return null;
}

async function findUserIdFromCustomer(
  customerId: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): Promise<string | null> {
  if (!customerId) return null;
  const id = typeof customerId === "string" ? customerId : customerId.id;
  const dbUser = await db.user.findFirst({
    where: { stripeCustomerId: id },
    select: { id: true },
  });
  return dbUser?.id ?? null;
}

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

async function handleSubscriptionDeleted(
  sub: Stripe.Subscription,
): Promise<void> {
  let userId = findUserIdInSubscriptionMetadata(sub);
  if (!userId) userId = await findUserIdFromCustomer(sub.customer);
  if (!userId) return;

  await db.$transaction([
    db.subscription.updateMany({
      where: { stripeSubscriptionId: sub.id },
      data: { status: "CANCELLED", cancelAtPeriodEnd: false },
    }),
    db.user.update({
      where: { id: userId },
      data: { plan: "FREE", stripeSubscriptionId: null },
    }),
  ]);
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
      : invoice.lines?.data?.find((l) => {
          const parent = (l as unknown as { parent?: { type?: string } }).parent;
          return parent?.type === "subscription_item_details";
        })?.subscription ?? null;

  if (!subId || typeof subId !== "string") {
    console.warn("invoice.payment_failed has no subscription reference");
    return;
  }
  await db.subscription.updateMany({
    where: { stripeSubscriptionId: subId },
    data: { status: "PAST_DUE" },
  });
}

async function applySubscriptionToUser(
  userId: string,
  sub: Stripe.Subscription,
): Promise<void> {
  const status = mapStripeStatus(sub.status);
  const plan = await getPlanFromSubscription(sub);
  const item = sub.items.data[0];
  if (!item) {
    console.warn(`subscription ${sub.id} has no items`);
    return;
  }

  // Period bounds moved to subscription items in API 2025-03-31+.
  const periodStart = new Date(item.current_period_start * 1000);
  const periodEnd = new Date(item.current_period_end * 1000);

  await db.$transaction([
    db.subscription.upsert({
      where: { stripeSubscriptionId: sub.id },
      create: {
        userId,
        stripeSubscriptionId: sub.id,
        stripePriceId: item.price.id,
        status,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      },
      update: {
        stripePriceId: item.price.id,
        status,
        currentPeriodStart: periodStart,
        currentPeriodEnd: periodEnd,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
      },
    }),
    db.user.update({
      where: { id: userId },
      data: {
        plan: status === "ACTIVE" || status === "TRIALING" ? plan : "FREE",
        stripeSubscriptionId: sub.id,
        stripeCustomerId:
          typeof sub.customer === "string" ? sub.customer : sub.customer.id,
      },
    }),
  ]);
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
        await handleSubscriptionDeleted(event.data.object);
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object);
        break;
      default:
        // Ignore unhandled events. Logged at INFO so we can audit.
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
