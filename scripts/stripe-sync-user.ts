// Recovery script: re-sync a single user's plan / subscription state from
// Stripe → our local DB. Use when a webhook didn't deliver (Stripe CLI not
// running, expired secret, network blip) and a paying user is still showing
// FREE in the app.
//
// Usage:
//   npm run db:stripe-sync -- codevexo@gmail.com
//
// Idempotent. Calls the same applySubscriptionToUser / downgradeSubscription
// helpers as the webhook, so the resulting state matches exactly what a
// successful webhook would produce.

import { stripe } from "../lib/stripe";
import { db } from "../lib/db";
import {
  applySubscriptionToUser,
  downgradeSubscription,
} from "../lib/stripe/subscription-sync";

async function syncByEmail(email: string): Promise<void> {
  const dbUser = await db.user.findUnique({ where: { email } });
  if (!dbUser) {
    throw new Error(`No local user with email ${email}`);
  }
  console.log(`Local user: ${dbUser.id} (plan=${dbUser.plan})`);

  // Find the customer. Prefer the stored stripeCustomerId; fall back to
  // searching Stripe by email if we never recorded one.
  let customerId = dbUser.stripeCustomerId;
  if (!customerId) {
    const customers = await stripe.customers.list({ email, limit: 1 });
    if (customers.data.length === 0) {
      console.log(
        `No Stripe customer for ${email}. User is genuinely on FREE; nothing to sync.`,
      );
      return;
    }
    customerId = customers.data[0].id;
    console.log(
      `Found Stripe customer ${customerId} by email (was not stored locally)`,
    );
  } else {
    console.log(`Stripe customer (from DB): ${customerId}`);
  }

  const subs = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 5,
  });

  if (subs.data.length === 0) {
    console.log("No subscriptions for this customer.");
    return;
  }

  // Pick the most relevant subscription. Active / trialing wins; otherwise
  // the most recently created.
  const activeOrTrialing = subs.data.find(
    (s) => s.status === "active" || s.status === "trialing",
  );
  const target =
    activeOrTrialing ??
    subs.data.slice().sort((a, b) => b.created - a.created)[0];

  console.log(
    `Selected subscription ${target.id} (status=${target.status}, price=${target.items.data[0]?.price.lookup_key})`,
  );

  if (target.status === "canceled" || target.status === "incomplete_expired") {
    await downgradeSubscription(target);
    console.log("Applied: downgrade to FREE.");
  } else {
    await applySubscriptionToUser(dbUser.id, target);
    console.log("Applied: upgraded local user to match Stripe state.");
  }

  const after = await db.user.findUnique({
    where: { id: dbUser.id },
    select: { plan: true, stripeSubscriptionId: true },
  });
  console.log(
    `Local state now: plan=${after?.plan}, stripeSubscriptionId=${after?.stripeSubscriptionId}`,
  );
}

async function main(): Promise<void> {
  const email = process.argv.slice(2).find((a) => !a.startsWith("-"));
  if (!email) {
    console.error("Usage: npm run db:stripe-sync -- <email>");
    process.exit(1);
  }
  await syncByEmail(email);
}

main()
  .catch((err) => {
    console.error("Sync failed:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
