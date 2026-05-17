import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { PLANS, formatPrice } from "@/lib/plans";
import { CheckoutButton } from "./checkout-button";

export const metadata = {
  title: "Pricing — AI Subtitle Generator",
  description: "Simple, transparent pricing for teams that ship subtitles.",
};

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const dbUser = authUser
    ? await db.user.findUnique({
        where: { supabaseId: authUser.id },
        select: { plan: true },
      })
    : null;

  const currentPlan = dbUser?.plan ?? null;
  const isAuthenticated = Boolean(authUser);

  return (
    <main className="min-h-screen px-6 py-16">
      <div className="mx-auto max-w-5xl">
        <header className="text-center">
          <p className="text-sm font-medium tracking-wide text-[var(--color-text-muted)]">
            Pricing
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl">
            Subtitles that fit your workflow
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--color-text-muted)]">
            Start free. Move up when your output does. Cancel any time from your
            billing portal.
          </p>
        </header>

        <section className="mt-12 grid gap-6 md:grid-cols-3 md:items-stretch">
          {Object.values(PLANS).map((plan) => {
            const isCurrent = currentPlan === plan.id;
            const isRecommended = plan.recommended ?? false;
            const buttonLabel =
              plan.id === "FREE"
                ? isAuthenticated
                  ? "Go to dashboard"
                  : "Get started"
                : `Upgrade to ${plan.name}`;
            const buttonVariant: "primary" | "secondary" = isRecommended
              ? "primary"
              : "secondary";

            return (
              <article
                key={plan.id}
                className={`flex flex-col rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-7 shadow-[0_8px_40px_rgba(0,0,0,0.06)] ${
                  isRecommended
                    ? "border-2 border-[var(--color-proofmark-red)]"
                    : "border border-[color:color-mix(in_oklab,var(--color-text-muted)_15%,transparent)]"
                }`}
              >
                {isRecommended ? (
                  <p className="self-start rounded-[var(--radius-sm)] bg-[var(--color-proofmark-red-wash)] px-2 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-proofmark-red-deep)]">
                    Recommended
                  </p>
                ) : null}

                <h2 className="mt-4 text-lg font-semibold text-[var(--color-text-primary)]">
                  {plan.name}
                </h2>
                <p className="mt-1 text-sm text-[var(--color-text-muted)]">
                  {plan.tagline}
                </p>

                <p className="mt-6 flex items-baseline gap-1">
                  <span className="text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
                    {formatPrice(plan)}
                  </span>
                  {plan.priceInPence > 0 ? (
                    <span className="text-sm text-[var(--color-text-muted)]">
                      / month
                    </span>
                  ) : null}
                </p>

                <ul className="mt-6 flex-1 space-y-2 text-sm text-[var(--color-text-primary)]">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <CheckIcon />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-7">
                  <CheckoutButton
                    planId={plan.id}
                    label={buttonLabel}
                    variant={buttonVariant}
                    isAuthenticated={isAuthenticated}
                    isCurrentPlan={isCurrent}
                  />
                </div>
              </article>
            );
          })}
        </section>

        <p className="mt-10 text-center text-xs text-[var(--color-text-muted)]">
          Prices in GBP, billed monthly. VAT may apply.{" "}
          {isAuthenticated ? (
            <Link
              href="/dashboard/settings"
              className="font-medium text-[var(--color-proofmark-red)] hover:text-[var(--color-proofmark-red-deep)]"
            >
              Manage your billing
            </Link>
          ) : (
            <Link
              href="/signup"
              className="font-medium text-[var(--color-proofmark-red)] hover:text-[var(--color-proofmark-red-deep)]"
            >
              Create a free account
            </Link>
          )}
        </p>
      </div>
    </main>
  );
}

function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 shrink-0 text-[var(--color-proofmark-red)]"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
