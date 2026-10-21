"use client";

import { useEffect, useRef, useState } from "react";
import type { StoredBlock, StoredPlan } from "@/lib/storage";
import { announceBlock, askNotificationPermission, notificationsSupported, unlockAudio } from "@/lib/alerts";
import { useT } from "@/lib/i18n-client";
import { saveSettings, useSettings } from "@/lib/settings";
import { compactDuration, durationLabel } from "@/lib/time";
import Link from "next/link";
import BreathingDialog from "./BreathingDialog";
import FocusOverlay from "./FocusOverlay";
import ExplainDialog from "./ExplainDialog";
import QuickCheckDialog from "./QuickCheckDialog";
import { coachLine } from "@/lib/coach";
import MorningChecklist from "./MorningChecklist";

const DOT: Record<StoredBlock["type"], string> = {
  study: "var(--dot-study)",
  break: "var(--dot-break)",
  revision: "var(--dot-rev)",
  sleep: "var(--dot-sleep)",
};

function BlockIcon({ type }: { type: StoredBlock["type"] }) {
  const c = DOT[type];
  const paths: Record<StoredBlock["type"], React.ReactNode> = {
    study: <><path d="M4 5.5A1.5 1.5 0 015.5 4H11v15H5.5A1.5 1.5 0 014 17.5z" /><path d="M20 5.5A1.5 1.5 0 0018.5 4H13v15h5.5a1.5 1.5 0 001.5-1.5z" /></>,
    break: <><path d="M5 8h11v5a4 4 0 01-4 4H9a4 4 0 01-4-4z" /><path d="M16 9h1.5a2 2 0 010 4H16" /><path d="M8 3v2M12 3v2" /></>,
    revision: <><path d="M12 3l1.8 4.7L18.5 9l-4.7 1.8L12 15.5l-1.8-4.7L5.5 9l4.7-1.3z" /><path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8z" /></>,
    sleep: <path d="M20 14.5A8 8 0 019.5 4 8 8 0 1020 14.5z" />,
  };
  return (
    <span
      aria-hidden="true"
      className="flex h-8 w-8 items-center justify-center rounded-full"
      style={{ background: `color-mix(in srgb, ${c} 20%, transparent)`, color: c }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{paths[type]}</svg>
    </span>
  );
}

const ORDINAL = ["", "", "second pass", "third pass", "fourth pass", "fifth pass"];

function countdown(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const p = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
}

function splitTopic(t: string | null) {
  const m = t ? /^(.*) \((.+)\)$/.exec(t) : null;
  return m ? { name: m[1], subject: m[2] } : { name: t ?? "", subject: "" };
}

interface Row {
  b: StoredBlock;
  i: number;
  title: string;
  subject: string;
  mins: number;
}

export default function PlanView({
  plan,
  onToggle,
  onEdit,
  onStartOver,
  fresh,
  onReplan,
  onQuickCheck,
  onToggleMorning,
  replanning,
  replanMsg,
  stress = 3,
  extra,
}: {
  plan: StoredPlan;
  onToggle: (i: number) => void;
  onEdit: () => void;
  onStartOver: () => void;
  fresh?: boolean;
  onReplan: () => void;
  onQuickCheck: (topic: string, wrong: number) => void;
  onToggleMorning: (i: number) => void;
  replanning: boolean;
  replanMsg: string;
  stress?: number;
  extra?: React.ReactNode;
}) {
  const [now, setNow] = useState<number | null>(null);
  const [breathing, setBreathing] = useState(false);
  const [focus, setFocus] = useState(false);
  const [check, setCheck] = useState<{ topic: string; subject: string } | null>(null);
  const [explain, setExplain] = useState<{ topic: string; subject: string } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const settings = useSettings();
  const t = useT();
  const lastIdx = useRef<number | null>(null);
  const [askedNotif, setAskedNotif] = useState(false);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Chime, buzz and notify when a new block starts (not for blocks we only catch up on late).
  useEffect(() => {
    if (now === null) return;
    const idx = plan.blocks.findIndex((b) => now >= b.startMs && now < b.endMs);
    const prev = lastIdx.current;
    lastIdx.current = idx;
    if (prev === null || idx === prev || idx < 0) return;
    if (now - plan.blocks[idx].startMs < 15000) announceBlock(plan.blocks[idx]);
  }, [now, plan.blocks]);

  const planStarted = now !== null && now >= plan.blocks[0].startMs;
  const showNotifAsk =
    planStarted && !askedNotif && !settings.notifications && notificationsSupported() && Notification.permission === "default";

  const hhmm = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });

  // Row data: titles get "second pass" suffixes for repeated study topics.
  const seen: Record<string, number> = {};
  const rows: Row[] = plan.blocks.map((b, i) => {
    const mins = Math.round((b.endMs - b.startMs) / 60000);
    if (b.type === "study") {
      const { name, subject } = splitTopic(b.topic);
      if (subject === "revisit") return { b, i, title: t("{name} — revisit", { name }), subject: "", mins };
      const n = (seen[name] = (seen[name] ?? 0) + 1);
      return { b, i, title: n > 1 ? `${name} — ${t(ORDINAL[n] ?? "extra pass")}` : name, subject: n > 1 ? "" : subject, mins };
    }
    if (b.type === "sleep") return { b, i, title: t(plan.nap ? "Nap until {time}" : "Sleep until {time}", { time: b.end }), subject: "", mins };
    if (b.type === "revision") return { b, i, title: t(b.topic ?? "Quick revision"), subject: "", mins };
    return { b, i, title: b.tip.startsWith("Free time") ? t("Free time") : t("Break"), subject: "", mins };
  });

  const checkable = rows.filter((r) => r.b.type !== "sleep");
  const doneCount = checkable.filter((r) => plan.done[r.i]).length;
  const pct = checkable.length ? Math.round((doneCount / checkable.length) * 100) : 0;
  const sleepBlock = plan.blocks.find((b) => b.type === "sleep");
  const sleepMin = sleepBlock ? Math.round((sleepBlock.endMs - sleepBlock.startMs) / 60000) : 0;

  const nowIdx = now === null ? -1 : plan.blocks.findIndex((b) => now >= b.startMs && now < b.endMs);
  const nowRow = nowIdx >= 0 ? rows[nowIdx] : null;
  const notStarted = now !== null && now < plan.blocks[0].startMs;
  const finished = now !== null && now >= plan.blocks[plan.blocks.length - 1].endMs;
  const earlier = now === null ? [] : rows.filter((r) => r.b.endMs <= now);
  const upcoming = rows.filter((r) => r.i !== nowIdx && !earlier.includes(r));
  const behind = earlier.filter((r) => r.b.type === "study" && !plan.done[r.i]).length;

  const openExplain = (t: string | null) => {
    const { name, subject } = splitTopic(t);
    setExplain({ topic: name, subject: subject === "revisit" ? "" : subject });
  };
  const isStudy = (r: Row) => r.b.type === "study" && splitTopic(r.b.topic).subject !== "revisit";
  const studyRows = rows.filter(isStudy);
  const coach = nowRow
    ? coachLine({
        studyDone: studyRows.filter((r) => plan.done[r.i]).length,
        studyTotal: studyRows.length,
        behind,
        stress,
        blockType: nowRow.b.type,
      }, t)
    : "";

  const closeBreathing = () => {
    setBreathing(false);
    setTimeout(() => document.getElementById("now-block")?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };

  const toggle = (r: Row) => {
    if (!plan.done[r.i] && r.b.type === "study") {
      const { name, subject } = splitTopic(r.b.topic);
      if (subject !== "revisit") setCheck({ topic: name, subject });
    }
    onToggle(r.i);
  };

  const renderRow = (r: Row, past = false) => {
    const done = !!plan.done[r.i];
    const isSleep = r.b.type === "sleep";
    return (
      <li key={r.i} className={`grid grid-cols-[3.25rem_2rem_1fr_auto] items-start gap-x-3 border-t border-line py-4 first:border-t-0 sm:grid-cols-[5rem_2rem_1fr_auto] ${past ? "opacity-75" : ""}`}>
        <span className="tnum pt-0.5 font-mono text-sm text-muted">{r.b.start}</span>
        <span className="flex justify-center"><BlockIcon type={r.b.type} /></span>
        <div className="min-w-0">
          <p className={`font-semibold break-words ${isSleep ? "text-sleepink" : ""} ${done ? "line-through opacity-70" : ""}`}>
            {r.title}
            {r.subject && <span className="font-normal text-muted"> · {r.subject}</span>}
            <span className="ml-2 text-sm font-normal text-muted">{durationLabel(r.mins)}</span>
          </p>
          <p className="text-muted">{t(r.b.tip)}</p>
          {r.b.type === "study" && !done && (
            <button type="button" className="no-print min-h-11 text-sm font-semibold text-accent underline" onClick={() => openExplain(r.b.topic)}>
              {t("Explain it fast")}
            </button>
          )}
        </div>
        {isSleep ? (
          <span aria-hidden="true" className="w-6" />
        ) : (
          <input
            type="checkbox"
            className="tick mt-0.5"
            checked={done}
            onChange={() => toggle(r)}
            aria-label={t("Mark done: {title}, {start} to {end}", { title: r.title, start: r.b.start, end: r.b.end })}
          />
        )}
      </li>
    );
  };

  return (
    <section className="anim-fade-up" onPointerDown={unlockAudio}>
      {fresh && (
        <p role="status" className="plan-ready no-print fixed left-1/2 top-4 z-30 -translate-x-1/2 rounded-full border border-nowline bg-now px-5 py-2 font-bold text-accent shadow-lg">
          ✓ {t("Plan ready")}
        </p>
      )}
      {plan.aiFailed && (
        <p role="status" className="no-print mb-6 rounded-2xl border border-line bg-surface2 px-4 py-3">
          <strong>{t("Couldn't reach AI, here's a backup plan.")}</strong>{" "}
          <span className="text-muted">{t("It follows the same rules: sleep protected, hardest topics first, breaks built in.")}</span>
        </p>
      )}
      {/* Hero */}
      <div className="mb-8 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted">
            <span className="dot" style={{ background: "var(--dot-study)", width: "0.5rem", height: "0.5rem" }} aria-hidden="true" />
            {plan.replannedAt ? t("Re-planned at {time} · sleep kept safe", { time: hhmm(plan.replannedAt) }) : t("Your plan is ready · sleep kept safe")}
          </p>
          <h1 className="mb-3 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">{t("You've got this tonight.")}</h1>
          <p className="max-w-xl text-lg text-muted">{t(plan.summary.message)}</p>
          {plan.studyWindowMin < 60 && (
            <p className="mt-3 max-w-xl text-muted">{t("You have under an hour, so this plan is short. That's okay. A focused hour is still worth a lot.")}</p>
          )}
        </div>
        <div className="no-print flex flex-wrap gap-3">
          <button type="button" className="btn" onClick={onReplan} disabled={replanning}>
            {replanning ? t("Re-planning...") : t("I'm behind — re-plan")}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setBreathing(true)}>{t("I'm panicking")}</button>
        </div>
      </div>
      {behind > 0 && !replanMsg && (
        <p className="no-print mb-4 text-muted">
          {behind > 1
            ? t("You have {n} unticked blocks from earlier. That's okay. Tap \"I'm behind\" and we'll rebuild the rest of the night.", { n: behind })
            : t("You have 1 unticked block from earlier. That's okay. Tap \"I'm behind\" and we'll rebuild the rest of the night.")}
        </p>
      )}
      <p role="status" className="mb-4 text-muted empty:hidden">{replanMsg}</p>
      {showNotifAsk && (
        <div className="no-print mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-4 py-3">
          <p>{t("Want a nudge when each block starts, even if this tab is in the background?")}</p>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-primary"
              onClick={async () => {
                unlockAudio();
                setAskedNotif(true);
                if (await askNotificationPermission()) saveSettings({ notifications: true });
              }}
            >
              {t("Turn on notifications")}
            </button>
            <button type="button" className="btn" onClick={() => setAskedNotif(true)}>{t("Not now")}</button>
          </div>
        </div>
      )}
      {breathing && <BreathingDialog onClose={closeBreathing} />}
      {focus && nowRow && now !== null && (
        <FocusOverlay topic={nowRow.title} initialMs={Math.max(1000, nowRow.b.endMs - now)} onClose={() => setFocus(false)} />
      )}
      {explain && <ExplainDialog topic={explain.topic} subject={explain.subject} onClose={() => setExplain(null)} />}
      {check && (
        <QuickCheckDialog
          topic={check.topic}
          subject={check.subject}
          onFinish={(wrong) => onQuickCheck(check.topic, wrong)}
          onClose={() => setCheck(null)}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        {/* Left column */}
        <div className="flex min-w-0 flex-col gap-6">
          {nowRow ? (
            <div id="now-block" aria-current="step" className="glow-now rounded-[1.5rem] border border-nowline bg-now p-5 sm:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="mb-2 text-sm font-bold uppercase tracking-widest text-accent">
                    {t("Now")} · {t(nowRow.b.type === "revision" ? "Revision" : nowRow.b.type === "sleep" ? (plan.nap ? "Nap" : "Sleep") : nowRow.b.type === "break" ? "Break" : "Study")}
                  </p>
                  <h2 className="text-3xl font-bold tracking-tight break-words sm:text-4xl">
                    {nowRow.title}
                    {nowRow.subject && <span className="font-normal text-muted"> · {nowRow.subject}</span>}
                  </h2>
                </div>
                <div className="text-right">
                  <p className="tnum text-5xl font-bold tracking-tight sm:text-7xl" aria-label={t("Time left in this block")}>{countdown(nowRow.b.endMs - (now ?? 0))}</p>
                  <p className="text-muted">{t("left · ends {time}", { time: nowRow.b.end })}</p>
                </div>
              </div>
              <p className="mt-3 text-lg text-muted">{t(nowRow.b.tip)}</p>
              {coach && <p className="mt-2 font-semibold text-accent">{coach}</p>}
              <div
                role="progressbar"
                aria-label={t("Time used in this block")}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.min(100, Math.round(((now! - nowRow.b.startMs) / (nowRow.b.endMs - nowRow.b.startMs)) * 100))}
                className="my-5 h-2 overflow-hidden rounded-full bg-surface2"
              >
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${Math.min(100, ((now! - nowRow.b.startMs) / (nowRow.b.endMs - nowRow.b.startMs)) * 100)}%` }}
                />
              </div>
              <div className="no-print flex flex-wrap gap-3">
                {nowRow.b.type !== "sleep" && (
                  <button
                    type="button"
                    className={`btn ${plan.done[nowRow.i] ? "" : "btn-primary"}`}
                    aria-pressed={!!plan.done[nowRow.i]}
                    onClick={() => toggle(nowRow)}
                  >
                    {plan.done[nowRow.i] ? t("Done ✓ (tap to undo)") : t("Mark done")}
                  </button>
                )}
                {nowRow.b.type === "study" && (
                  <button type="button" className="btn" onClick={() => setFocus(true)}>{t("Focus mode")}</button>
                )}
                {nowRow.b.type === "study" && (
                  <button type="button" className="btn" onClick={() => openExplain(nowRow.b.topic)}>{t("Explain it fast")}</button>
                )}
                <button type="button" className="btn" onClick={() => setBreathing(true)}>{t("Breathe for a minute")}</button>
              </div>
            </div>
          ) : (
            <div className="rounded-[1.5rem] border border-nowline bg-now p-6 sm:p-8" role="status">
              <p className="mb-2 text-sm font-bold uppercase tracking-widest text-accent">{finished ? t("All done") : t("Up first")}</p>
              <h2 className="text-3xl font-bold tracking-tight">
                {finished
                  ? t("That's the night. Well done.")
                  : notStarted
                    ? t("Your plan starts at {time}", { time: plan.blocks[0].start })
                    : t("Take a moment")}
              </h2>
              <p className="mt-2 text-lg text-muted">
                {finished ? t("Check the morning-of list, then go show them what you know.") : t("Get a drink of water and settle in.")}
              </p>
            </div>
          )}

          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-bold">{t("Up next")}</h2>
              <span id="prog-label" className="text-sm text-muted">{t("{a} of {b} done", { a: doneCount, b: checkable.length })}</span>
            </div>
            <div
              role="progressbar"
              aria-labelledby="prog-label"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              className="mb-2 h-1.5 overflow-hidden rounded-full bg-surface2"
            >
              <div className="h-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
            </div>
            {earlier.length > 0 && (
              <details className="border-t border-line py-3">
                <summary className="cursor-pointer text-sm font-semibold text-muted">{t("Earlier tonight ({n})", { n: earlier.length })}</summary>
                <ol className="mt-2">{earlier.map((r) => renderRow(r, true))}</ol>
              </details>
            )}
            <ol>{upcoming.map((r) => renderRow(r))}</ol>
          </div>

          {plan.skipped.length > 0 && (
            <div className="card">
              <h2 className="mb-1 text-xl font-bold">{t("You can't cover everything tonight. Here's the best use of your time.")}</h2>
              <p className="mb-3 text-muted">{t("These topics are skipped or skim-only:")}</p>
              <ul className="flex flex-col gap-2">
                {plan.skipped.map((s) => (
                  <li key={s.topic}>
                    <strong>{s.topic}</strong>: <span className="text-muted">{t(s.reason)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <aside className="flex min-w-0 flex-col gap-6" aria-label={t("Plan details")}>
          <dl className="grid grid-cols-3 divide-x divide-line overflow-hidden rounded-[1.25rem] border border-line bg-surface text-center">
            <div className="px-2 py-5">
              <dd className="text-2xl font-bold tracking-tight">{compactDuration(plan.summary.studyMinutes)}</dd>
              <dt className="text-sm text-muted">{t("study")}</dt>
            </div>
            <div className="px-2 py-5">
              <dd className="text-2xl font-bold tracking-tight">{plan.summary.topicsCovered}</dd>
              <dt className="text-sm text-muted">{t(plan.summary.topicsCovered === 1 ? "topic" : "topics")}</dt>
            </div>
            <div className="px-2 py-5">
              <dd className="text-2xl font-bold tracking-tight text-sleepink">{compactDuration(sleepMin)}</dd>
              <dt className="text-sm text-muted">{t(plan.nap ? "nap" : "sleep")}</dt>
            </div>
          </dl>

          <MorningChecklist plan={plan} now={now} onToggle={onToggleMorning} />

          <section className="card" aria-labelledby="take-title">
            <h2 id="take-title" className="mb-4 text-lg font-bold">{t("Take it with you")}</h2>
            {extra}
            <div className="no-print mt-4 flex flex-wrap gap-x-5 gap-y-2 text-accent">
              <button
                type="button"
                className="min-h-11 font-semibold underline"
                aria-pressed={settings.sound}
                onClick={() => { unlockAudio(); saveSettings({ sound: !settings.sound }); }}
              >
                {settings.sound ? t("Sound: on") : t("Sound: off")}
              </button>
              <Link href="/countdown" className="inline-flex min-h-11 items-center font-semibold underline">{t("Countdown screen")}</Link>
              <button type="button" className="min-h-11 font-semibold underline" onClick={onEdit}>{t("Edit topics")}</button>
              <button type="button" className="min-h-11 font-semibold underline" onClick={() => window.print()}>{t("Print plan")}</button>
              <button type="button" className="min-h-11 font-semibold underline" onClick={() => dialogRef.current?.showModal()}>{t("Start over")}</button>
            </div>
          </section>

          <p className="no-print text-center text-sm text-muted">
            {plan.source === "ai" ? t("Made with AI") : t("Made offline with the built-in planner")}
          </p>
        </aside>
      </div>

      <dialog
        ref={dialogRef}
        aria-labelledby="so-title"
        className="m-auto w-[min(92vw,28rem)] rounded-2xl border border-line bg-surface p-6 text-ink backdrop:bg-black/60"
      >
        <h2 id="so-title" className="mb-2 text-xl font-bold">{t("Start over?")}</h2>
        <p className="mb-5 text-muted">{t("This clears your plan and topics. You can't undo it.")}</p>
        <div className="flex justify-end gap-3">
          <button type="button" className="btn" autoFocus onClick={() => dialogRef.current?.close()}>{t("Keep my plan")}</button>
          <button type="button" className="btn btn-primary" onClick={() => { dialogRef.current?.close(); onStartOver(); }}>
            {t("Yes, start over")}
          </button>
        </div>
      </dialog>
    </section>
  );
}
