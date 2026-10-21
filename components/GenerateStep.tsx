import { useEffect, useState } from "react";
import type { AppState } from "@/lib/storage";
import { checkTiming, clockOf, dayLabel, shortDate } from "@/lib/timing";
import { durationLabel, inputToMin, toLocalMin } from "@/lib/time";
import Stepper from "./Stepper";

const LOADING_LINES = ["Putting the hardest topics first...", "Protecting your sleep...", "Adding breaks so you can breathe...", "Almost there..."];

export default function GenerateStep({
  state,
  building,
  error,
  onBack,
  onBuild,
}: {
  state: AppState;
  building: boolean;
  error: string;
  onBack: () => void;
  onBuild: () => void;
}) {
  const [line, setLine] = useState(0);
  useEffect(() => {
    if (!building) return;
    const id = setInterval(() => setLine((l) => Math.min(l + 1, LOADING_LINES.length - 1)), 900);
    return () => {
      clearInterval(id);
      setLine(0);
    };
  }, [building]);
  const nowMin = toLocalMin(new Date());
  const start = inputToMin(state.timing.startAt)!;
  const sleep = inputToMin(state.timing.sleepAt)!;
  const exam = inputToMin(state.timing.examAt)!;
  const nap = checkTiming(state.timing, nowMin).nap;
  const total = Math.max(1, exam - start);
  const studyPct = Math.min(100, Math.max(0, ((sleep - start) / total) * 100));

  const rows: [string, React.ReactNode][] = [
    ["Exam", `${shortDate(exam)} · ${clockOf(exam)}`],
    ["Start studying", `${dayLabel(start, nowMin)} · ${clockOf(start)}`],
    [nap ? "Nap" : "Sleep", `${dayLabel(sleep, nowMin, true)} · ${clockOf(sleep)}`],
    [
      "Topics",
      state.topics.map((t, i) => (
        <span key={t.id}>
          {i > 0 && ", "}
          {t.name}
          {t.subject && <span className="font-normal text-muted"> · {t.subject}</span>}
        </span>
      )),
    ],
  ];

  return (
    <section>
      <Stepper step={3} />
      <h1 className="page-title mb-2">Ready when you are.</h1>
      <p className="mb-8 text-lg text-muted">Check this looks right, then we&apos;ll build your night.</p>

      <div className="card mb-5">
        <div
          role="img"
          aria-label={`Study ${durationLabel(sleep - start)}, then ${nap ? "nap" : "sleep"} ${durationLabel(exam - sleep)}`}
          className="flex h-3 overflow-hidden rounded-full"
        >
          <div className="h-full" style={{ width: `${studyPct}%`, background: "var(--dot-study)" }} />
          <div className="h-full flex-1" style={{ background: "var(--dot-sleep)" }} />
        </div>
        <div className="tnum relative mt-2 h-5 font-mono text-sm text-muted" aria-hidden="true">
          <span className="absolute left-0">{clockOf(start)}</span>
          <span className="absolute -translate-x-1/2" style={{ left: `${Math.min(88, Math.max(12, studyPct))}%` }}>{clockOf(sleep)}</span>
          <span className="absolute right-0">{clockOf(exam)}</span>
        </div>
        <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
          <li className="flex items-center gap-2"><span className="dot" style={{ background: "var(--dot-study)", width: "0.625rem", height: "0.625rem" }} aria-hidden="true" />Study · {durationLabel(sleep - start)}</li>
          <li className="flex items-center gap-2"><span className="dot" style={{ background: "var(--dot-sleep)", width: "0.625rem", height: "0.625rem" }} aria-hidden="true" />{nap ? "Nap" : "Sleep"} · {durationLabel(exam - sleep)}</li>
        </ul>
      </div>

      <dl className="card mb-6 !py-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-start justify-between gap-6 border-t border-line py-4 first:border-t-0">
            <dt className="text-muted">{k}</dt>
            <dd className="text-right font-bold">{v}</dd>
          </div>
        ))}
      </dl>

      <div aria-live="polite" className="mb-3 min-h-6">
        {building && (
          <div role="status" className="flex items-center gap-3">
            <span className="spinner" aria-hidden="true" />
            <div>
              <p className="font-semibold">Making your plan...</p>
              <p className="text-sm text-muted">{LOADING_LINES[line]}</p>
            </div>
          </div>
        )}
        {error && <p role="alert" className="text-danger">{error}</p>}
      </div>
      <div className="flex justify-between gap-3">
        <button type="button" className="btn" onClick={onBack} disabled={building}>Back</button>
        <button type="button" className="btn btn-primary" onClick={onBuild} disabled={building}>
          {building ? "Making your plan..." : "Build my plan"}
        </button>
      </div>
    </section>
  );
}
