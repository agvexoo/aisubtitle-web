import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "./login-form";

interface PageProps {
  searchParams: Promise<{ next?: string; error?: string }>;
}

export default async function LoginPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { next, error } = await searchParams;

  if (user) {
    redirect(next ?? "/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <section className="w-full max-w-md rounded-[var(--radius-lg)] bg-[var(--color-surface)] px-8 py-10 shadow-[0_8px_40px_rgba(0,0,0,0.10)]">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-proofmark-red)]">
            Sign in
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Welcome back. Continue to your subtitle workspace.
          </p>
        </header>

        <LoginForm next={next} initialError={error} />

        <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
          New here?{" "}
          <Link
            href="/signup"
            className="font-medium text-[var(--color-proofmark-red)] hover:text-[var(--color-proofmark-red-deep)]"
          >
            Create an account
          </Link>
        </p>
      </section>
    </main>
  );
}
