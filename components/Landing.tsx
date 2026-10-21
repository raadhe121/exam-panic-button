export default function Landing({ onStart }: { onStart: () => void }) {
  return (
    <section className="flex flex-col items-start gap-6 py-8 sm:py-16">
      <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl">Exam tomorrow? Let&apos;s make a plan.</h1>
      <p className="max-w-prose text-lg text-muted">
        Tell us when your exam is and what you still don&apos;t know. You&apos;ll get a calm, hour-by-hour revision plan for tonight,
        with breaks and sleep protected. It takes under a minute.
      </p>
      <button type="button" className="btn btn-primary text-lg" onClick={onStart}>
        Start my plan
      </button>
    </section>
  );
}
