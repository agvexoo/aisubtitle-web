// Stripe SDK singleton. Pinned to the latest API version per stripe-best-
// practices skill. Dynamic payment methods are enabled by NOT passing
// payment_method_types anywhere in the codebase.
import Stripe from "stripe";
import { env } from "@/lib/env";

declare global {
  var __stripeClient: Stripe | undefined;
}

export const stripe =
  globalThis.__stripeClient ??
  new Stripe(env.STRIPE_SECRET_KEY, {
    apiVersion: "2026-04-22.dahlia",
    typescript: true,
    appInfo: {
      name: "aisubtitle-web",
      url: "https://aisubtitle.online",
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.__stripeClient = stripe;
}
