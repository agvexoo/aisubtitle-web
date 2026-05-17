export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <section className="w-full max-w-xl rounded-[var(--radius-lg)] bg-[var(--color-surface)] px-8 py-10 text-center shadow-[0_8px_40px_rgba(0,0,0,0.10)]">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--color-proofmark-red)]">
          AI Subtitle Generator
        </h1>
        <p className="mt-2 text-[var(--color-text-muted)]">
          Upload an audio or video file and receive perfectly paced SRT
          subtitles.
        </p>
        <p className="mt-6 text-sm text-[var(--color-text-muted)]">
          Scaffold ready. Auth, billing, and dashboard arriving in later phases.
        </p>
      </section>
    </main>
  );
}
