"use client";

import { useState } from "react";
import Link from "next/link";
import type { Plan } from "@prisma/client";
import { PLANS, formatPrice } from "@/lib/plans";

interface BillingSectionProps {
  plan: Plan;
  hasStripeCustomer: boolean;
}

export function BillingSection({ plan, hasStripeCustomer }: BillingSectionProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const planDef = PLANS[plan];

  async function openPortal() {
    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/stripe/portal", { method: "POST" });
      const data: { url?: string; error?: string } = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not open billing portal.");
        setPending(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Network error. Please try again.");
      setPending(false);
    }
  }

  return (
    <section
      aria-labelledby="billing-heading"
      className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-7 shadow-[0_8px_40px_rgba(0,0,0,0.06)]"
    >
      <header className="flex items-start justify-between gap-4">
        <div>
          <h2
            id="billing-heading"
            className="text-lg font-semibold text-[var(--color-text-primary)]"
          >
            Billing
          </h2>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Your current plan and billing portal.
          </p>
        </div>
        <span
          className={`rounded-[var(--radius-sm)] px-2 py-1 text-xs font-semibold uppercase tracking-wide ${
            plan === "FREE"
              ? "bg-[var(--color-page-warm)] text-[var(--color-text-muted)]"
              : "bg-[var(--color-proofmark-red-wash)] text-[var(--color-proofmark-red-deep)]"
          }`}
        >
          {planDef.name}
        </span>
      </header>

      <dl className="mt-6 grid grid-cols-2 gap-y-3 text-sm">
        <dt className="text-[var(--color-text-muted)]">Plan</dt>
        <dd className="text-right font-medium text-[var(--color-text-primary)]">
          {planDef.name}
        </dd>
        <dt className="text-[var(--color-text-muted)]">Price</dt>
        <dd className="text-right font-medium text-[var(--color-text-primary)]">
          {formatPrice(planDef)}
          {planDef.priceInPence > 0 ? " / month" : ""}
        </dd>
      </dl>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-end">
        {hasStripeCustomer ? (
          <button
            type="button"
            onClick={openPortal}
            disabled={pending}
            className="rounded-[var(--radius-sm)] border border-[color:color-mix(in_oklab,var(--color-text-muted)_30%,transparent)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-page-warm)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? "Opening..." : "Manage billing"}
          </button>
        ) : null}
        <Link
          href="/pricing"
          className="rounded-[var(--radius-sm)] bg-[var(--color-proofmark-red)] px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-[var(--color-proofmark-red-deep)]"
        >
          {plan === "FREE" ? "Upgrade plan" : "Change plan"}
        </Link>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-3 rounded-[var(--radius-sm)] bg-[var(--color-proofmark-red-wash)] px-3 py-2 text-sm text-[var(--color-proofmark-red-deep)]"
        >
          {error}
        </p>
      ) : null}
    </section>
  );
}
