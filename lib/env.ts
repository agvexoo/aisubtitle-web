// Server-only environment validation.
// Do NOT import this file from a client component — it references the
// SUPABASE_SERVICE_ROLE_KEY which must never reach the browser. Client code
// should reference `process.env.NEXT_PUBLIC_*` directly (those are inlined
// at build time by Next).
import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z
    .string()
    .regex(
      /^postgres(ql)?:\/\/.+/,
      "DATABASE_URL must be a postgres:// or postgresql:// connection string",
    ),
  // Stripe restricted or secret key. Test mode starts with rk_test_ / sk_test_,
  // live starts with rk_live_ / sk_live_.
  STRIPE_SECRET_KEY: z
    .string()
    .regex(
      /^(rk|sk)_(test|live)_/,
      "STRIPE_SECRET_KEY must start with rk_test_, rk_live_, sk_test_, or sk_live_",
    ),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z
    .string()
    .regex(
      /^pk_(test|live)_/,
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY must start with pk_test_ or pk_live_",
    ),
  // Webhook secret is validated inside the webhook route, not here — it's
  // only generated when `stripe listen` runs and is dev-only optional.
});

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
});

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(
    `Invalid or missing environment variables:\n${issues}\n` +
      `Check .env.local (dev) or .env.production (VPS).`,
  );
}

export const env = parsed.data;
