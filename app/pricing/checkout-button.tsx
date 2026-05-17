"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { PlanId } from "@/lib/plans";

interface CheckoutButtonProps {
  planId: PlanId;
  label: string;
  variant: "primary" | "secondary";
  isAuthenticated: boolean;
  isCurrentPlan: boolean;
}

export function CheckoutButton({
  planId,
  label,
  variant,
  isAuthenticated,
  isCurrentPlan,
}: CheckoutButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const baseClasses =
    "w-full rounded-[var(--radius-sm)] px-4 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";
  const variantClasses =
    variant === "primary"
      ? "bg-[var(--color-proofmark-red)] text-white hover:bg-[var(--color-proofmark-red-deep)]"
      : "border border-[color:color-mix(in_oklab,var(--color-text-muted)_30%,transparent)] bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-page-warm)]";

  if (isCurrentPlan) {
    return (
      <button
        type="button"
        disabled
        className={`${baseClasses} ${variantClasses}`}
      >
        Current plan
      </button>
    );
  }

  if (planId === "FREE") {
    return (
      <button
        type="button"
        onClick={() => router.push(isAuthenticated ? "/dashboard" : "/signup")}
        className={`${baseClasses} ${variantClasses}`}
      >
        {isAuthenticated ? "Go to dashboard" : "Get started"}
      </button>
    );
  }

  async function onClick() {
    setError(null);
    if (!isAuthenticated) {
      router.push(`/login?next=${encodeURIComponent("/pricing")}`);
      return;
    }
    setPending(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data: { url?: string; error?: string } = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Could not start checkout. Please try again.");
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
    <div className="space-y-2">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className={`${baseClasses} ${variantClasses}`}
      >
        {pending ? "Redirecting..." : label}
      </button>
      {error ? (
        <p
          role="alert"
          className="rounded-[var(--radius-sm)] bg-[var(--color-proofmark-red-wash)] px-3 py-2 text-xs text-[var(--color-proofmark-red-deep)]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
