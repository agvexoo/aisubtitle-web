// POST /api/stripe/checkout
// Body: { planId: "PRO" | "ENTERPRISE" }
// Creates (or reuses) a Stripe Customer for the authenticated user, opens a
// Checkout session for the requested plan's price (looked up by lookup_key),
// and returns { url } for the client to redirect to.
//
// Dynamic payment methods: we deliberately do NOT pass payment_method_types,
// per stripe-best-practices skill.
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { requireUser } from "@/lib/auth/require-user";
import { PLANS, type PlanId } from "@/lib/plans";

const bodySchema = z.object({
  planId: z.enum(["PRO", "ENTERPRISE"]),
});

export async function POST(request: NextRequest) {
  const session = await requireUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { authUser, dbUser } = session;

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body" },
      { status: 400 },
    );
  }

  const planId: PlanId = parsed.data.planId;
  const plan = PLANS[planId];
  if (!plan.stripeLookupKey) {
    return NextResponse.json(
      { error: "Selected plan is not purchasable" },
      { status: 400 },
    );
  }

  // Resolve the Stripe price by lookup_key — no hardcoded IDs.
  const prices = await stripe.prices.list({
    lookup_keys: [plan.stripeLookupKey],
    active: true,
    limit: 1,
  });
  const price = prices.data[0];
  if (!price) {
    return NextResponse.json(
      {
        error:
          "Plan price not found in Stripe. Run `npm run db:stripe-seed` first.",
      },
      { status: 500 },
    );
  }

  // Reuse or create the Stripe Customer for this user.
  let customerId = dbUser.stripeCustomerId;
  if (!customerId) {
    if (!authUser.email) {
      return NextResponse.json(
        { error: "User has no email on file" },
        { status: 400 },
      );
    }
    const customer = await stripe.customers.create({
      email: authUser.email,
      name: dbUser.name ?? undefined,
      metadata: { app_user_id: dbUser.id, supabase_id: authUser.id },
    });
    customerId = customer.id;
    await db.user.update({
      where: { id: dbUser.id },
      data: { stripeCustomerId: customerId },
    });
  }

  const checkout = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: price.id, quantity: 1 }],
    success_url: `${env.NEXT_PUBLIC_APP_URL}/dashboard?checkout=success`,
    cancel_url: `${env.NEXT_PUBLIC_APP_URL}/pricing?checkout=cancelled`,
    allow_promotion_codes: true,
    metadata: {
      app_user_id: dbUser.id,
      plan_id: planId,
      price_lookup_key: plan.stripeLookupKey,
    },
    subscription_data: {
      metadata: {
        app_user_id: dbUser.id,
        plan_id: planId,
      },
    },
  });

  if (!checkout.url) {
    return NextResponse.json(
      { error: "Stripe did not return a checkout URL" },
      { status: 500 },
    );
  }

  return NextResponse.json({ url: checkout.url });
}
