"use client";

import { useT } from "@/lib/i18n-client";

export default function Stepper({ step }: { step: 1 | 2 | 3 }) {
  const t = useT();
  const labels = [t("Timing"), t("Topics"), t("Review")];
  return (
    <nav aria-label={t("Progress")} className="mb-8">
      <ol className="mb-3 grid grid-cols-3 gap-2">
        {labels.map((l, i) => (
          <li
            key={l}
            aria-current={step === i + 1 ? "step" : undefined}
            className={`h-1.5 rounded-full ${step >= i + 1 ? "bg-accent" : "bg-line"}`}
          >
            <span className="sr-only">{l}{step > i + 1 ? ` ${t("(done)")}` : ""}</span>
          </li>
        ))}
      </ol>
      <p className="text-sm font-semibold text-muted">{t("Step {n} of 3", { n: step })} · {labels[step - 1]}</p>
    </nav>
  );
}
