"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";

interface UpgradeModalProps {
  open: boolean;
  reason?: string | null;
  onClose: () => void;
}

// Inline upgrade modal triggered by 403 upgradeRequired responses.
// Per DESIGN.md "Modal as first thought" ban, this is reserved for the case
// where the user MUST make a decision — they hit a hard quota and either
// upgrade or stop. Inline status messaging covers everything else.
export function UpgradeModal({ open, reason, onClose }: UpgradeModalProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upgrade-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <button
        type="button"
        aria-label="Close upgrade dialog"
        onClick={onClose}
        className="absolute inset-0 bg-[color:color-mix(in_oklab,var(--color-text-primary)_55%,transparent)]"
      />
      <div className="relative w-full max-w-md rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-7 shadow-[0_24px_60px_rgba(0,0,0,0.18)]">
        <h2
          id="upgrade-modal-title"
          className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)]"
        >
          Upgrade to keep going
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          {reason ??
            "You've reached the limit of your current plan for this month."}
        </p>

        <ul className="mt-5 space-y-2 text-sm text-[var(--color-text-primary)]">
          <li className="flex items-start gap-2">
            <CheckIcon />
            Unlimited uploads on Pro and Enterprise
          </li>
          <li className="flex items-start gap-2">
            <CheckIcon />
            More transcription minutes
          </li>
          <li className="flex items-start gap-2">
            <CheckIcon />
            VTT and ASS export formats
          </li>
        </ul>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="rounded-[var(--radius-sm)] border border-[color:color-mix(in_oklab,var(--color-text-muted)_30%,transparent)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-page-warm)]"
          >
            Not now
          </button>
          <Link
            href="/pricing"
            className="rounded-[var(--radius-sm)] bg-[var(--color-proofmark-red)] px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-[var(--color-proofmark-red-deep)]"
          >
            See plans
          </Link>
        </div>
      </div>
    </div>
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
