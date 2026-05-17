import Link from "next/link";

interface PageProps {
  searchParams: Promise<{ reason?: string }>;
}

export default async function AuthErrorPage({ searchParams }: PageProps) {
  const { reason } = await searchParams;
  const friendly = reason ? decodeURIComponent(reason) : null;

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <section className="w-full max-w-md rounded-[var(--radius-lg)] bg-[var(--color-surface)] px-8 py-10 text-center shadow-[0_8px_40px_rgba(0,0,0,0.10)]">
        <h1 className="text-2xl font-bold tracking-tight text-[var(--color-proofmark-red)]">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-[var(--color-text-muted)]">
          We could not complete sign-in. Please try again.
        </p>

        {friendly ? (
          <p
            role="alert"
            className="mt-4 rounded-[var(--radius-sm)] bg-[var(--color-proofmark-red-wash)] px-3 py-2 text-sm text-[var(--color-proofmark-red-deep)]"
          >
            {friendly}
          </p>
        ) : null}

        <Link
          href="/login"
          className="mt-6 inline-block rounded-[var(--radius-sm)] bg-[var(--color-proofmark-red)] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-proofmark-red-deep)]"
        >
          Back to sign in
        </Link>
      </section>
    </main>
  );
}
