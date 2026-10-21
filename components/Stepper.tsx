export default function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const labels = ["Timing", "Topics", "Generate"];
  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="flex items-center">
        {labels.map((l, i) => {
          const n = i + 1;
          const done = step > n;
          const current = step === n;
          return (
            <li key={l} aria-current={current ? "step" : undefined} className="flex flex-1 items-center last:flex-none">
              <span className="flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-bold ${
                    done || current ? "border-transparent bg-accent text-accentink" : "border-line text-muted"
                  }`}
                >
                  {done ? "✓" : n}
                </span>
                <span className={`text-sm font-semibold ${current ? "text-ink" : "text-muted"}`}>
                  {l}
                  {done && <span className="sr-only"> (done)</span>}
                </span>
              </span>
              {n < 3 && <span aria-hidden="true" className={`mx-3 h-0.5 flex-1 rounded ${done ? "bg-accent" : "bg-line"}`} />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
