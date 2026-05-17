import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Placeholder. The real dashboard lands in Phase 8 (overview, recent uploads,
// account, settings). For now it just confirms auth works end-to-end and
// gives the user a sign-out button so the loop is testable.
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <section className="w-full max-w-xl rounded-[var(--radius-lg)] bg-[var(--color-surface)] px-8 py-10 text-center shadow-[0_8px_40px_rgba(0,0,0,0.10)]">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-proofmark-red)]">
          Dashboard
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          Signed in as <strong>{user.email}</strong>.
        </p>
        <p className="mt-6 text-sm text-[var(--color-text-muted)]">
          The real dashboard arrives in Phase 8 (usage, uploads, account,
          settings).
        </p>

        <form action="/auth/signout" method="post" className="mt-8">
          <button
            type="submit"
            className="rounded-[var(--radius-sm)] bg-[var(--color-proofmark-red)] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-proofmark-red-deep)]"
          >
            Sign out
          </button>
        </form>
      </section>
    </main>
  );
}
