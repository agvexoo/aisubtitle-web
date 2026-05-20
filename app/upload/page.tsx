import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { resetUsageIfDue } from "@/lib/usage";
import { PLANS, formatPrice } from "@/lib/plans";
import { UploadForm } from "./upload-form";

export const metadata = {
  title: "Upload — AI Subtitle Generator",
};

function formatLimit(used: number, limit: number | null): string {
  if (limit === null) return `${used} used`;
  return `${used} / ${limit}`;
}

export default async function UploadPage() {
  const session = await requireUser();
  if (!session) redirect("/login?next=/upload");
  const { dbUser } = session;

  const usage = await resetUsageIfDue(dbUser.id);
  const planDef = PLANS[dbUser.plan];

  return (
    <main className="min-h-screen px-6 py-12">
      <div className="mx-auto max-w-xl space-y-8">
        <header>
          <Link
            href="/dashboard"
            className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-proofmark-red)]"
          >
            ← Back to dashboard
          </Link>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-[var(--color-text-primary)]">
            Generate subtitles
          </h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Upload an audio or video file. We&apos;ll return a perfectly paced
            SRT in under a minute.
          </p>
        </header>

        <section
          aria-label="Current usage"
          className="rounded-[var(--radius-md)] border border-[color:color-mix(in_oklab,var(--color-text-muted)_15%,transparent)] bg-[var(--color-surface)] px-5 py-4 text-sm"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-medium text-[var(--color-text-primary)]">
                {planDef.name} plan
              </p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {formatPrice(planDef)}
                {planDef.priceInPence > 0 ? " / month" : ""}
              </p>
            </div>
            <dl className="text-right text-xs text-[var(--color-text-muted)]">
              <div>
                <dt className="inline">Uploads this month: </dt>
                <dd className="inline font-medium text-[var(--color-text-primary)]">
                  {formatLimit(usage.uploadsThisMonth, planDef.uploadsPerMonth)}
                </dd>
              </div>
              <div>
                <dt className="inline">Minutes this month: </dt>
                <dd className="inline font-medium text-[var(--color-text-primary)]">
                  {formatLimit(usage.minutesThisMonth, planDef.minutesPerMonth)}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="rounded-[var(--radius-lg)] bg-[var(--color-surface)] p-7 shadow-[0_8px_40px_rgba(0,0,0,0.06)]">
          <UploadForm />
        </section>

        <p className="text-center text-xs text-[var(--color-text-muted)]">
          Files are processed and discarded immediately. Nothing is stored
          beyond the transcript metadata.
        </p>
      </div>
    </main>
  );
}
