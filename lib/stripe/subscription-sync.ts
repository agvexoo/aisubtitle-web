// Shared sync logic for keeping the local DB aligned with Stripe's source of
// truth for a single subscription. Used by:
//   - app/api/webhooks/stripe/route.ts        (event-driven, the main path)
//   - scripts/stripe-sync-user.ts             (manual recovery for missed
//                                              webhooks, paste-the-state safety net)
//
// All operations here are idempotent — calling sync twice with the same
// Stripe subscription object yields the same DB state.
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { planFromLookupKey } from "@/lib/plans";
import { trackServer } from "@/lib/analytics-server";
import type { SubscriptionStatus, Plan } from "@prisma/client";

export function mapStripeStatus(
  status: Stripe.Subscription.Status,
): SubscriptionStatus {
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

export async function getPlanFromSubscription(
  sub: Stripe.Subscription,
): Promise<Plan> {
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

export function findUserIdInSubscriptionMetadata(
  sub: Stripe.Subscription,
): string | null {
  const meta = sub.metadata;
  if (meta && typeof meta.app_user_id === "string") return meta.app_user_id;
  return null;
}

export async function findUserIdFromCustomer(
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

export async function applySubscriptionToUser(
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

  if (status === "ACTIVE" || status === "TRIALING") {
    trackServer(userId, "subscription_activated", { plan_id: plan });
  }
}

export async function downgradeSubscription(
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

  trackServer(userId, "subscription_cancelled", {});
}
