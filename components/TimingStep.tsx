"use client";

import { useState } from "react";
import type { TimingInputs } from "@/lib/storage";
import { checkTiming, dayLabel, defaultSleep, nextClock, weekday } from "@/lib/timing";
import { durationLabel, inputToMin, minToInput, toLocalMin } from "@/lib/time";
import Stepper from "./Stepper";

const STRESS = ["Calm", "A bit", "Nervous", "Stressed", "Panicking"];

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
  const nowMin = toLocalMin(new Date());
  const check = checkTiming(timing, nowMin);
  const show = submitted ? check.errors : {};

  const exam = inputToMin(timing.examAt);
  const start = inputToMin(timing.startAt);
  const sleep = inputToMin(timing.sleepAt);
  const [examDate, examTime] = timing.examAt.split("T");
  const startTime = timing.startAt.split("T")[1] ?? "";
  const sleepTime = timing.sleepAt.split("T")[1] ?? "";

  const update = (p: Partial<TimingInputs>) => {
    const t = { ...timing, ...p };
    const s = inputToMin(t.startAt);
    if (!t.sleepTouched && ("examAt" in p || "startAt" in p)) {
      const e = inputToMin(t.examAt);
      if (e !== null && s !== null) t.sleepAt = minToInput(defaultSleep(e, s));
    } else if (t.sleepTouched && "startAt" in p && s !== null) {
      const clock = t.sleepAt.split("T")[1];
      if (clock) t.sleepAt = minToInput(nextClock(s, clock));
    }
    onChange(t);
  };

  const studyMin = start !== null && sleep !== null && sleep > start ? sleep - start : null;
  const examHint =
    exam !== null && exam > nowMin
      ? `${dayLabel(exam, nowMin)}, ${weekday(exam)} · ${durationLabel(exam - nowMin)} from now`
      : "Pick a date and time in the future";

  const timeField = (id: string, label: string, value: string, err: string | undefined, onVal: (v: string) => void, hint: string) => (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="font-semibold">{label}</label>
      <input
        id={id}
        type="time"
        className="input"
        value={value}
        onChange={(e) => e.target.value && onVal(e.target.value)}
        aria-invalid={err ? true : undefined}
        aria-describedby={`${id}-d`}
      />
      <p id={`${id}-d`} className={err ? "text-danger" : "text-sm text-muted"}>{err ?? hint}</p>
    </div>
  );

  return (
    <section>
      <Stepper step={1} />
      <h1 className="page-title mb-2">When&apos;s your exam?</h1>
      <p className="mb-8 text-lg text-muted">We&apos;ll plan around it and protect your sleep.</p>
      <form
        className="flex flex-col gap-6"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(true);
          if (check.ok) onNext();
        }}
      >
        <fieldset className="rounded-[1.5rem] border border-nowline bg-now p-6">
          <legend className="sr-only">Exam date and time</legend>
          <p className="mb-4 text-sm font-bold uppercase tracking-widest text-accent">Exam starts</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1">
              <label htmlFor="exam-date" className="sr-only">Exam date</label>
              <input
                id="exam-date"
                type="date"
                className="input"
                value={examDate ?? ""}
                min={minToInput(nowMin).split("T")[0]}
                onChange={(e) => e.target.value && update({ examAt: `${e.target.value}T${examTime || "09:00"}` })}
                aria-invalid={show.exam ? true : undefined}
                aria-describedby="exam-d"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="exam-time" className="sr-only">Exam time</label>
              <input
                id="exam-time"
                type="time"
                className="input"
                value={examTime ?? ""}
                onChange={(e) => e.target.value && update({ examAt: `${examDate}T${e.target.value}` })}
                aria-invalid={show.exam ? true : undefined}
                aria-describedby="exam-d"
              />
            </div>
          </div>
          <p id="exam-d" className={`mt-3 ${show.exam ? "text-danger" : "text-muted"}`}>{show.exam ?? examHint}</p>
        </fieldset>

        <div className="grid gap-6 sm:grid-cols-2">
          {timeField(
            "start",
            "Start studying",
            startTime,
            show.start,
            (v) => update({ startAt: `${timing.startAt.split("T")[0]}T${v}` }),
            start !== null ? `${dayLabel(start, nowMin)} · defaults to now` : "",
          )}
          {timeField(
            "sleep",
            check.nap ? "Nap time" : "Go to sleep",
            sleepTime,
            show.sleep,
            (v) => start !== null && update({ sleepAt: minToInput(nextClock(start, v)), sleepTouched: true }),
            exam !== null && sleep !== null && exam > sleep
              ? `${durationLabel(exam - sleep)} before your exam`
              : check.nap
                ? "Your exam is close, so we'll plan a short nap"
                : "",
          )}
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-line bg-surface px-5 py-4">
          <span className="text-muted">Time to study</span>
          <span className="tnum font-mono text-xl font-bold" aria-live="polite">{studyMin !== null ? durationLabel(studyMin) : "-"}</span>
        </div>

        <fieldset>
          <legend className="mb-1 font-semibold">How stressed are you right now?</legend>
          <p className="mb-3 text-sm text-muted">Be honest. If it&apos;s high, we&apos;ll make your plan gentler: shorter blocks, more breaks and an easy start.</p>
          <div className="grid grid-cols-5 gap-2">
            {STRESS.map((label, i) => (
              <label key={label} className="seg flex-col justify-center !px-1 text-center">
                <input
                  type="radio"
                  className="sr-only"
                  name="stress"
                  checked={(timing.stress ?? 3) === i + 1}
                  onChange={() => update({ stress: i + 1 })}
                />
                <span className="text-lg font-bold">{i + 1}</span>
                <span className="text-xs font-normal text-muted">{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {check.warnings.length > 0 && (
          <ul className="flex flex-col gap-2" aria-live="polite">
            {check.warnings.map((w) => (
              <li key={w} className="rounded-xl border border-line bg-surface2 px-4 py-3">
                <strong className="text-warn">Heads up: </strong>
                {w}
              </li>
            ))}
          </ul>
        )}

        <button type="submit" className="btn btn-primary w-full text-lg">Next: add topics</button>
      </form>
    </section>
  );
}
