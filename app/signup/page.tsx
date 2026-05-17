import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SignupForm } from "./signup-form";

export default async function SignupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <section className="w-full max-w-md rounded-[var(--radius-lg)] bg-[var(--color-surface)] px-8 py-10 shadow-[0_8px_40px_rgba(0,0,0,0.10)]">
        <header className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-[var(--color-proofmark-red)]">
            Create your account
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Start generating subtitles in minutes.
          </p>
        </header>

        <SignupForm />

        <p className="mt-6 text-center text-sm text-[var(--color-text-muted)]">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-[var(--color-proofmark-red)] hover:text-[var(--color-proofmark-red-deep)]"
          >
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
