"use client";

import { useEffect, useRef, useState } from "react";
import type { StoredBlock, StoredPlan } from "@/lib/storage";
import { durationLabel } from "@/lib/time";

const TYPE_LABEL: Record<StoredBlock["type"], string> = {
  study: "Study",
  break: "Break",
  revision: "Final revision",
  sleep: "Sleep",
};

function countdown(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
}

export default function PlanView({
  plan,
  onToggle,
  onEdit,
  onStartOver,
}: {
  plan: StoredPlan;
  onToggle: (i: number) => void;
  onEdit: () => void;
  onStartOver: () => void;
}) {
  const [now, setNow] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const checkable = plan.blocks.map((b, i) => ({ b, i })).filter((x) => x.b.type !== "sleep");
  const doneCount = checkable.filter((x) => plan.done[x.i]).length;
  const pct = checkable.length ? Math.round((doneCount / checkable.length) * 100) : 0;
  const sleepBlock = plan.blocks.find((b) => b.type === "sleep");
  const sleepMin = sleepBlock ? Math.round((sleepBlock.endMs - sleepBlock.startMs) / 60000) : 0;
  const nowIdx = now === null ? -1 : plan.blocks.findIndex((b) => now >= b.startMs && now < b.endMs);
  const notStarted = now !== null && now < plan.blocks[0].startMs;
  const hhmm = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

  return (
    <section>
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold">Your plan for tonight</h1>
        <span className="no-print rounded-md border border-line px-2 py-0.5 text-sm font-semibold text-muted">
          {plan.source === "ai" ? "Made by AI" : "Made offline (built-in planner)"}
        </span>
      </div>
      <p className="mb-4 text-lg text-muted">{plan.summary.message}</p>
      {plan.studyWindowMin < 60 && (
        <p className="mb-4 rounded-lg border-2 border-line bg-surface2 px-3 py-2">
          You have under an hour, so this plan is short. That&apos;s okay. A focused hour is still worth a lot.
        </p>
      )}

      <dl className="mb-4 grid grid-cols-3 gap-3 text-center">
        <div className="card p-3">
          <dd className="text-2xl font-bold">{durationLabel(plan.summary.studyMinutes)}</dd>
          <dt className="text-sm text-muted">Study time</dt>
        </div>
        <div className="card p-3">
          <dd className="text-2xl font-bold">{plan.summary.topicsCovered}</dd>
          <dt className="text-sm text-muted">Topics</dt>
        </div>
        <div className="card p-3">
          <dd className="text-2xl font-bold">{durationLabel(sleepMin)}</dd>
          <dt className="text-sm text-muted">{plan.nap ? "Nap protected" : "Sleep protected"}</dt>
        </div>
      </dl>

      <div className="card mb-6">
        <div className="mb-2 flex justify-between font-semibold">
          <span id="prog-label">Progress</span>
          <span>{doneCount} of {checkable.length} done</span>
        </div>
        <div
          role="progressbar"
          aria-labelledby="prog-label"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          className="h-3 overflow-hidden rounded-full bg-surface2"
        >
          <div className="h-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {notStarted && (
        <p className="mb-4 rounded-lg border-2 border-accent px-3 py-2" role="status">
          Your plan starts at {hhmm(plan.blocks[0].startMs)}. Get a drink of water and settle in.
        </p>
      )}

      <ol className="mb-8 flex flex-col gap-3">
        {plan.blocks.map((b, i) => {
          const isNow = i === nowIdx;
          const done = !!plan.done[i];
          const title = b.topic ?? TYPE_LABEL[b.type];
          const id = `block-${i}`;
          return (
            <li
              key={i}
              aria-current={isNow ? "step" : undefined}
              className={`rounded-2xl border-2 p-4 ${isNow ? "border-accent bg-now" : "border-line bg-surface"} ${b.type === "break" ? "ml-4" : ""}`}
            >
              <div className="flex items-start gap-3">
                {b.type !== "sleep" ? (
                  <input
                    id={id}
                    type="checkbox"
                    className="mt-1 h-6 w-6 shrink-0 accent-[var(--accent)]"
                    checked={done}
                    onChange={() => onToggle(i)}
                    aria-label={`Mark done: ${title}, ${b.start} to ${b.end}`}
                  />
                ) : (
                  <span aria-hidden="true" className="mt-1 w-6 shrink-0 text-center">☾</span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
                    <span className="font-semibold text-ink">{b.start} to {b.end}</span>
                    <span>· {durationLabel(Math.round((b.endMs - b.startMs) / 60000))}</span>
                    <span className="rounded-md border border-line px-2 py-0.5 font-semibold">{TYPE_LABEL[b.type]}</span>
                    {isNow && now !== null && (
                      <span className="rounded-md bg-accent px-2 py-0.5 font-bold text-accentink">
                        Now · <span aria-label="time left">{countdown(b.endMs - now)}</span> left
                      </span>
                    )}
                  </div>
                  <p className={`text-lg font-semibold break-words ${done ? "line-through opacity-70" : ""}`}>{title}</p>
                  <p className="text-muted">{b.tip}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      {plan.skipped.length > 0 && (
        <div className="card mb-8">
          <h2 className="mb-1 text-xl font-bold">You can&apos;t cover everything tonight. Here&apos;s the best use of your time.</h2>
          <p className="mb-3 text-muted">These topics are skipped or skim-only:</p>
          <ul className="flex flex-col gap-2">
            {plan.skipped.map((s) => (
              <li key={s.topic}>
                <strong>{s.topic}</strong>: <span className="text-muted">{s.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="no-print flex flex-wrap gap-3">
        <button type="button" className="btn" onClick={onEdit}>Edit topics</button>
        <button type="button" className="btn" onClick={() => window.print()}>Print plan</button>
        <button type="button" className="btn" onClick={() => dialogRef.current?.showModal()}>Start over</button>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="so-title"
        className="m-auto w-[min(92vw,28rem)] rounded-2xl border-2 border-line bg-surface p-6 text-ink backdrop:bg-black/60"
      >
        <h2 id="so-title" className="mb-2 text-xl font-bold">Start over?</h2>
        <p className="mb-5 text-muted">This clears your plan and topics. You can&apos;t undo it.</p>
        <div className="flex justify-end gap-3">
          <button type="button" className="btn" autoFocus onClick={() => dialogRef.current?.close()}>Keep my plan</button>
          <button type="button" className="btn btn-primary" onClick={() => { dialogRef.current?.close(); onStartOver(); }}>
            Yes, start over
          </button>
        </div>
      </dialog>
    </section>
  );
}
