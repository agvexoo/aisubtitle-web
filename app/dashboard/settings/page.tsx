import { redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth/require-user";
import { BillingSection } from "./billing-section";

export const metadata = {
  title: "Settings — AI Subtitle Generator",
};

// Placeholder settings shell. Phase 8 will replace this with the full account
// settings UI (name change, danger zone, etc.). For now it carries the
// billing section so we can verify the Stripe flow end-to-end.
export default async function SettingsPage() {
  const session = await requireUser();
  if (!session) redirect("/login?next=/dashboard/settings");
  const { authUser, dbUser } = session;

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-3xl space-y-8">
        <header>
          <Link
            href="/dashboard"
            className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-proofmark-red)]"
          >
            ← Back to dashboard
          </Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Settings
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Signed in as <strong>{authUser.email}</strong>.
          </p>
        </header>

        <BillingSection
          plan={dbUser.plan}
          hasStripeCustomer={Boolean(dbUser.stripeCustomerId)}
        />

        <p className="text-center text-xs text-[var(--color-text-muted)]">
          Account name, password, and danger zone arrive in Phase 8.
        </p>
      </div>
    </main>
  );
}
