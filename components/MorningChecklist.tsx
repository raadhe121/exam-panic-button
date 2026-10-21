"use client";

import { durationLabel } from "@/lib/time";
import type { StoredPlan } from "@/lib/storage";

export default function MorningChecklist({
  plan,
  now,
  onToggle,
}: {
  plan: StoredPlan;
  now: number | null;
  onToggle: (i: number) => void;
}) {
  const topics = [...new Set(plan.blocks.filter((b) => b.type === "study" && b.topic).map((b) => (b.topic as string).replace(/ \(.+\)$/, "")))].slice(0, 3);
  const items = [
    topics.length
      ? `10-minute skim: ${topics.join(", ")} formulas and key points`
      : "10-minute skim of your summary notes. Nothing new.",
    "Pack ID / hall ticket, pens, calculator if allowed, water",
    "Eat something light and drink water",
    "Leave so you arrive 20 minutes early",
    "Three slow breaths before you go in",
  ];
  const left = plan.examMs && now ? plan.examMs - now : null;
  const done = plan.morningDone ?? {};

  return (
    <section className="card" aria-labelledby="morning-title">
      <h2 id="morning-title" className="text-lg font-bold">Morning-of checklist</h2>
      <p className="mb-5 text-sm text-muted">
        {left !== null && left > 0 ? `Exam in ${durationLabel(Math.round(left / 60000))} · ` : ""}15 minutes before you leave
      </p>
      <ul className="flex flex-col gap-4">
        {items.map((t, i) => (
          <li key={i}>
            <label className="flex items-start gap-3">
              <input type="checkbox" className="tick mt-0.5" checked={!!done[i]} onChange={() => onToggle(i)} />
              <span className={done[i] ? "line-through opacity-70" : ""}>{t}</span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
