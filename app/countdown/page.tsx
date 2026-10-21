"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n-client";
import { remainingTopics } from "@/lib/replan";
import { loadState, type AppState } from "@/lib/storage";
import { compactDuration } from "@/lib/time";

function hms(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${Math.floor(s / 3600)}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

export default function CountdownPage() {
  const t = useT();
  const [state, setState] = useState<AppState | null | undefined>(undefined);
  const [now, setNow] = useState<number | null>(null);
  const [full, setFull] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- hydrate from localStorage after mount */
    const read = () => setState(loadState());
    read();
    setNow(Date.now());
    /* eslint-enable react-hooks/set-state-in-effect */
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(read, 5000);
    window.addEventListener("storage", read);
    // Keep the screen awake while this page is open (best effort).
    let lock: WakeLockSentinel | null = null;
    navigator.wakeLock?.request("screen").then((l) => (lock = l)).catch(() => {});
    const onFs = () => setFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
      window.removeEventListener("storage", read);
      document.removeEventListener("fullscreenchange", onFs);
      lock?.release().catch(() => {});
    };
  }, []);

  const plan = state?.plan;
  const shell = "fixed inset-0 z-40 overflow-auto bg-bg p-6 sm:p-10";

  if (state === undefined || now === null) return <div className={shell}><p className="text-muted" role="status">{t("Loading...")}</p></div>;
  if (!plan || !plan.examMs) {
    return (
      <div className={`${shell} flex flex-col items-center justify-center gap-4 text-center`}>
        <h1 className="page-title">{t("No plan to count down yet")}</h1>
        <p className="text-muted">{t("Make a plan first, then open this screen and leave it running all night.")}</p>
        <Link href="/" className="btn btn-primary">{t("Make a plan")}</Link>
      </div>
    );
  }

  const sleep = plan.blocks.find((b) => b.type === "sleep");
  const sleepLeft = !sleep ? 0 : now < sleep.startMs ? sleep.endMs - sleep.startMs : Math.max(0, sleep.endMs - now);
  const topicsLeft = remainingTopics(state!.topics, plan.blocks, plan.done).length;
  const cur = plan.blocks.find((b) => now >= b.startMs && now < b.endMs);
  const examMs = plan.examMs;
  const stats: { label: string; value: string; sub?: string; tone?: string }[] = [
    { label: t("Hours until exam"), value: examMs > now ? hms(examMs - now) : "0:00:00", sub: examMs > now ? "" : t("Good luck. You've got this.") },
    { label: t("Hours of sleep left"), value: compactDuration(Math.round(sleepLeft / 60000)), tone: "text-sleepink", sub: sleep && now >= sleep.startMs && now < sleep.endMs ? t("Sleeping now") : t("Protected") },
    { label: t("Topics left"), value: String(topicsLeft), sub: topicsLeft === 0 ? t("All done") : undefined },
  ];

  return (
    <div className={shell}>
      <div className="mx-auto flex min-h-full max-w-6xl flex-col">
        <div className="no-print mb-6 flex items-center justify-between gap-3">
          <Link href="/" className="btn">{t("Back to my plan")}</Link>
          <button
            type="button"
            className="btn"
            onClick={() => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}))}
          >
            {full ? t("Exit full screen") : t("Full screen")}
          </button>
        </div>

        <main className="flex flex-1 flex-col justify-center gap-10">
          <div>
            <p className="mb-2 text-sm font-bold uppercase tracking-widest text-accent">{t("Exam countdown")}</p>
            <h1 className="tnum text-7xl font-extrabold leading-none tracking-tight sm:text-9xl" aria-label={t("Time until exam")}>
              <span className="gradient-text">{stats[0].value}</span>
            </h1>
            <p className="mt-3 text-xl text-muted">{stats[0].label}{stats[0].sub ? ` · ${stats[0].sub}` : ""}</p>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2">
            {stats.slice(1).map((s) => (
              <div key={s.label} className="card">
                <dd className={`tnum text-5xl font-bold tracking-tight sm:text-7xl ${s.tone ?? ""}`}>{s.value}</dd>
                <dt className="mt-1 text-lg text-muted">{s.label}{s.sub ? ` · ${s.sub}` : ""}</dt>
              </div>
            ))}
          </dl>

          <p className="text-xl text-muted" role="status">
            {cur ? (
              <>
                {t("Right now:")} <strong className="text-ink">{cur.type === "sleep" ? t("Sleep") : t(cur.topic ?? (cur.type === "break" ? "Break" : cur.type))}</strong> {t("until {time}", { time: cur.end })}
              </>
            ) : now < plan.blocks[0].startMs ? (
              t("Your plan starts at {time}.", { time: plan.blocks[0].start })
            ) : (
              t("That's the plan done. Rest up.")
            )}
          </p>
        </main>
      </div>
    </div>
  );
}
