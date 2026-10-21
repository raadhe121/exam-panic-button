export default function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const labels = ["Timing", "Topics", "Review"];
  return (
    <nav aria-label="Progress" className="mb-8">
      <ol className="mb-3 grid grid-cols-3 gap-2">
        {labels.map((l, i) => (
          <li
            key={l}
            aria-current={step === i + 1 ? "step" : undefined}
            className={`h-1.5 rounded-full ${step >= i + 1 ? "bg-accent" : "bg-line"}`}
          >
            <span className="sr-only">{l}{step > i + 1 ? " (done)" : ""}</span>
          </li>
        ))}
      </ol>
      <p className="text-sm font-semibold text-muted">Step {step} of 3 · {labels[step - 1]}</p>
    </nav>
  );
}
