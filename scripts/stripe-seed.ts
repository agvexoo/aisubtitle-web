// Idempotent seed for Stripe products + prices.
// Run with: npm run db:stripe-seed
//
// Strategy:
//   1. For each plan that has a stripeLookupKey, list existing prices by
//      that lookup_key.
//   2. If a price exists, keep it (don't touch). Log its id.
//   3. If not, create a product (or reuse one with metadata.app_plan) and
//      attach a recurring price with the lookup_key.
//
// Lookup keys make this safe to re-run; we never duplicate. Prices in Stripe
// are immutable — if you change the price amount in lib/plans.ts and re-run,
// the script logs a warning and instructs you to archive + recreate manually.

import { PLANS, type PlanDefinition } from "../lib/plans";
import { stripe } from "../lib/stripe";

async function ensurePrice(plan: PlanDefinition): Promise<void> {
  if (!plan.stripeLookupKey) {
    console.log(`[skip] ${plan.id}: no stripeLookupKey (free plan)`);
    return;
  }

  // Look for an existing price by lookup_key (active only).
  const existing = await stripe.prices.list({
    lookup_keys: [plan.stripeLookupKey],
    active: true,
    expand: ["data.product"],
  });

  if (existing.data.length > 0) {
    const price = existing.data[0];
    const productName =
      typeof price.product === "object" && "name" in price.product
        ? price.product.name
        : "(unknown)";
    if (price.unit_amount !== plan.priceInPence) {
      console.warn(
        `[warn] ${plan.id}: existing price ${price.id} is ` +
          `${price.unit_amount} pence but lib/plans.ts says ${plan.priceInPence}. ` +
          `Stripe prices are immutable. To change, archive the existing price ` +
          `in the dashboard and re-run this script.`,
      );
    } else {
      console.log(
        `[ok] ${plan.id}: price ${price.id} (${productName}) already exists`,
      );
    }
    return;
  }

  // Look for an existing product by metadata.app_plan so we don't create
  // duplicate products when prices were archived.
  const productSearch = await stripe.products.search({
    query: `metadata['app_plan']:'${plan.id}'`,
    limit: 1,
  });

  const product =
    productSearch.data[0] ??
    (await stripe.products.create({
      name: plan.name,
      description: plan.tagline,
      metadata: { app_plan: plan.id },
    }));

  const price = await stripe.prices.create({
    product: product.id,
    unit_amount: plan.priceInPence,
    currency: plan.currency,
    recurring: { interval: "month" },
    lookup_key: plan.stripeLookupKey,
    metadata: { app_plan: plan.id },
  });

  console.log(
    `[created] ${plan.id}: product ${product.id} → price ${price.id} ` +
      `(lookup_key=${plan.stripeLookupKey})`,
  );
}

async function main(): Promise<void> {
  console.log("Seeding Stripe products + prices...\n");
  for (const plan of Object.values(PLANS)) {
    await ensurePrice(plan);
  }
  console.log("\nDone. The app references prices by lookup_key, not by id,");
  console.log("so no env update is needed.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
