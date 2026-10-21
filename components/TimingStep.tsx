"use client";

import { useState } from "react";
import type { TimingInputs } from "@/lib/storage";
import { checkTiming, defaultSleep } from "@/lib/timing";
import { inputToMin, minToInput, toLocalMin } from "@/lib/time";
import Stepper from "./Stepper";

export default function TimingStep({
  timing,
  onChange,
  onNext,
}: {
  timing: TimingInputs;
  onChange: (t: TimingInputs) => void;
  onNext: () => void;
}) {
  const [submitted, setSubmitted] = useState(false);
  const check = checkTiming(timing, toLocalMin(new Date()));
  const show = submitted ? check.errors : {};

  const update = (p: Partial<TimingInputs>) => {
    const t = { ...timing, ...p };
    if (!t.sleepTouched && ("examAt" in p || "startAt" in p)) {
      const e = inputToMin(t.examAt);
      const s = inputToMin(t.startAt);
      if (e !== null && s !== null) t.sleepAt = minToInput(defaultSleep(e, s));
    }
    onChange(t);
  };

  const field = (id: string, label: string, value: string, err: string | undefined, onVal: (v: string) => void, hint?: string) => (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="font-semibold">{label}</label>
      <input
        id={id}
        type="datetime-local"
        className="input"
        value={value}
        onChange={(e) => onVal(e.target.value)}
        aria-invalid={err ? true : undefined}
        aria-describedby={`${id}-d`}
      />
      <p id={`${id}-d`} className={err ? "text-danger" : "text-sm text-muted"}>
        {err ?? hint}
      </p>
    </div>
  );

  return (
    <section>
      <Stepper step={1} />
      <h1 className="page-title mb-2"><span aria-hidden="true">⏰ </span>When&apos;s your exam?</h1>
      <p className="mb-6 text-muted">We&apos;ll protect your sleep and plan around it.</p>
      <form
        className="card flex flex-col gap-5"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
          if (check.ok) onNext();
        }}
      >
        {field("exam", "Exam date and time", timing.examAt, show.exam, (v) => update({ examAt: v }))}
        {field("start", "Time I can start studying", timing.startAt, show.start, (v) => update({ startAt: v }), "Defaults to now.")}
        {field(
          "sleep",
          check.nap ? "Time for a short nap" : "Time I want to sleep",
          timing.sleepAt,
          show.sleep,
          (v) => update({ sleepAt: v, sleepTouched: true }),
          check.nap ? "Your exam is close, so we'll plan a short nap." : "Defaults to 7 hours before your exam.",
        )}
        {check.warnings.length > 0 && (
          <ul className="flex flex-col gap-2" aria-live="polite">
            {check.warnings.map((w) => (
              <li key={w} className="rounded-lg border-2 border-line bg-surface2 px-3 py-2">
                <strong className="text-warn">Heads up: </strong>
                {w}
              </li>
            ))}
          </ul>
        )}
        <div className="flex justify-end">
          <button type="submit" className="btn btn-primary">Next: topics</button>
        </div>
      </form>
    </section>
  );
}
