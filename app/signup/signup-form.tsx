"use client";

import { useActionState } from "react";
import { signUpWithPassword, type SignupState } from "./actions";
import { track } from "@/lib/analytics";

const INITIAL_STATE: SignupState = {
  error: null,
  needsConfirmation: false,
};

export function SignupForm() {
  const [state, action, isPending] = useActionState<SignupState, FormData>(
    async (prev, formData) => {
      const result = await signUpWithPassword(prev, formData);
      if (!result.error) {
        track("user_signed_up", { method: "email" });
      }
      return result;
    },
    INITIAL_STATE,
  );

  if (state.needsConfirmation) {
    return (
      <div
        role="status"
        className="rounded-[var(--radius-sm)] bg-[var(--color-proofmark-red-wash)] px-4 py-3 text-sm text-[var(--color-text-primary)]"
      >
        <p className="font-medium text-[var(--color-proofmark-red-deep)]">
          Check your email
        </p>
        <p className="mt-1 text-[var(--color-text-muted)]">
          We sent a confirmation link. Click it to activate your account, then
          sign in.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-[var(--color-text-primary)]"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1 block w-full rounded-[var(--radius-sm)] border border-[color:color-mix(in_oklab,var(--color-text-muted)_30%,transparent)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-proofmark-red)] focus:outline-none focus:ring-2 focus:ring-[color:color-mix(in_oklab,var(--color-proofmark-red)_25%,transparent)]"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-[var(--color-text-primary)]"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="mt-1 block w-full rounded-[var(--radius-sm)] border border-[color:color-mix(in_oklab,var(--color-text-muted)_30%,transparent)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-proofmark-red)] focus:outline-none focus:ring-2 focus:ring-[color:color-mix(in_oklab,var(--color-proofmark-red)_25%,transparent)]"
        />
        <p className="mt-1 text-xs text-[var(--color-text-muted)]">
          At least 8 characters.
        </p>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-[var(--radius-sm)] bg-[var(--color-proofmark-red)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-proofmark-red-deep)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isPending ? "Creating account..." : "Create account"}
      </button>

      {state.error ? (
        <p
          role="alert"
          className="rounded-[var(--radius-sm)] bg-[var(--color-proofmark-red-wash)] px-3 py-2 text-sm text-[var(--color-proofmark-red-deep)]"
        >
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
