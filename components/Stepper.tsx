export default function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const labels = ["Timing", "Topics", "Generate"];
  return (
    <nav aria-label="Progress" className="mb-6">
      <ol className="flex gap-2">
        {labels.map((l, i) => (
          <li
            key={l}
            aria-current={step === i + 1 ? "step" : undefined}
            className={`flex-1 rounded-lg border-2 px-3 py-1 text-sm font-semibold ${
              step === i + 1 ? "border-accent bg-surface2" : "border-line text-muted"
            }`}
          >
            {i + 1}. {l}
            {step > i + 1 ? " (done)" : ""}
          </li>
        ))}
      </ol>
    </nav>
  );
}
