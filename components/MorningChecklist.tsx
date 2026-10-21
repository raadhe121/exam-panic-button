"use client";

import { durationLabel } from "@/lib/time";
import type { StoredPlan } from "@/lib/storage";

export default function MorningChecklist({
  plan,
  now,
  onToggle,
  onBreathe,
}: {
  plan: StoredPlan;
  now: number | null;
  onToggle: (i: number) => void;
  onBreathe: () => void;
}) {
  const topics = [...new Set(plan.blocks.filter((b) => b.type === "study" && b.topic).map((b) => b.topic as string))].slice(0, 3);
  const items = [
    topics.length
      ? `Quick skim (about 10 min): formulas and key points for ${topics.join(", ")}.`
      : "Quick skim (about 10 min): your summary notes. Don't start anything new.",
    "Pack your bag: ID or hall ticket, pens and pencils, calculator if allowed, a water bottle.",
    "Eat something light and drink some water.",
    "Plan your trip. Aim to arrive 20 minutes early.",
    "Take three slow breaths before you go in.",
  ];
  const left = plan.examMs && now ? plan.examMs - now : null;
  const done = plan.morningDone ?? {};

  return (
    <section className="card mb-6 border-accent" aria-labelledby="morning-title">
      <h2 id="morning-title" className="mb-1 text-2xl font-bold">Good morning. You&apos;re ready.</h2>
      <p className="mb-4 text-muted">
        {left !== null && left > 0
          ? `Your exam starts in ${durationLabel(Math.round(left / 60000))}. Here's a 15-minute checklist.`
          : "Here's a 15-minute checklist for before the exam."}
      </p>
      <ul className="mb-4 flex flex-col gap-3">
        {items.map((t, i) => (
          <li key={i}>
            <label className="flex items-start gap-3">
              <input type="checkbox" className="mt-1 h-6 w-6 shrink-0 accent-[var(--accent)]" checked={!!done[i]} onChange={() => onToggle(i)} />
              <span className={done[i] ? "line-through opacity-70" : ""}>{t}</span>
            </label>
          </li>
        ))}
      </ul>
      <button type="button" className="btn" onClick={onBreathe}>Breathe for a minute</button>
    </section>
  );
}
