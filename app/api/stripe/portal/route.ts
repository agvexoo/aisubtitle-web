// POST /api/stripe/portal
// Returns a billing portal URL for the authenticated user. Used by the
// /dashboard/settings billing section to let users manage their subscription
// (cancel, change plan, update card, see invoices) without us building any
// of that UI ourselves.
import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { env } from "@/lib/env";
import { requireUser } from "@/lib/auth/require-user";

export async function POST() {
  const session = await requireUser();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!session.dbUser.stripeCustomerId) {
    return NextResponse.json(
      {
        error:
          "No billing account yet. Subscribe to a plan first via /pricing.",
      },
      { status: 400 },
    );
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: session.dbUser.stripeCustomerId,
    return_url: `${env.NEXT_PUBLIC_APP_URL}/dashboard/settings`,
  });

  return NextResponse.json({ url: portal.url });
}
