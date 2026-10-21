"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { fetchShared, type SharedPlan } from "@/lib/buddy";
import { useT } from "@/lib/i18n";
import { supabaseConfigured } from "@/lib/supabase";
import { compactDuration } from "@/lib/time";

const DOT = { study: "var(--dot-study)", break: "var(--dot-break)", revision: "var(--dot-rev)", sleep: "var(--dot-sleep)" } as const;

function countdown(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(Math.floor(s / 60))}:${p(s % 60)}`;
}

function BuddyView() {
  const t = useT();
  const { code } = useParams<{ code: string }>();
  const [data, setData] = useState<SharedPlan | null | undefined>(undefined);
  const [now, setNow] = useState(() => Date.now());
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!supabaseConfigured) return;
    let alive = true;
    const load = () =>
      fetchShared(code).then(
        (d) => alive && (setData(d), setErr("")),
        () => alive && setErr(t("Can't reach the plan right now. Retrying...")),
      );
    load();
    const poll = setInterval(load, 3000);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      alive = false;
      clearInterval(poll);
      clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- poll per share code; `t` is only for the retry text
  }, [code]);

  const wrap = "mx-auto w-full max-w-2xl";
  if (!supabaseConfigured) return <section className={wrap}><h1 className="page-title">{t("Sharing isn't set up on this site")}</h1></section>;
  if (data === undefined) return <section className={wrap}><p className="text-muted" role="status">{err || t("Loading...")}</p></section>;
  if (data === null) {
    return (
      <section className={`${wrap} text-center`}>
        <p aria-hidden="true" className="mb-3 text-5xl">🔗</p>
        <h1 className="page-title mb-2">{t("This link isn't active")}</h1>
        <p className="mb-6 text-muted">{t("Your friend may have stopped sharing. Ask them for a new link.")}</p>
        <Link href="/" className="btn btn-primary">{t("Make my own plan")}</Link>
      </section>
    );
  }

  const { plan, done } = data;
  const rows = plan.blocks.map((b, i) => ({ b, i }));
  const checkable = rows.filter((r) => r.b.type !== "sleep");
  const doneCount = checkable.filter((r) => done[r.i]).length;
  const pct = checkable.length ? Math.round((doneCount / checkable.length) * 100) : 0;
  const cur = rows.find((r) => now >= r.b.startMs && now < r.b.endMs);
  const ago = Math.max(0, Math.round((now - new Date(data.updated_at).getTime()) / 1000));

  return (
    <section className={wrap}>
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted">
        <span className="dot animate-pulse" style={{ background: "var(--dot-study)", width: "0.5rem", height: "0.5rem" }} aria-hidden="true" />
        {ago < 5 ? t("Live · updated just now") : t("Live · updated {n}s ago", { n: ago })}
      </p>
      <h1 className="page-title mb-2">{t("Studying together")}</h1>
      <p className="mb-6 text-lg text-muted">{t("You're following")} <strong className="text-ink">{data.title}</strong>. {t("Ticks appear as your friend finishes each block.")}</p>

      <div className="card mb-6">
        <div className="mb-2 flex justify-between font-semibold">
          <span id="buddy-prog">{t("Their progress")}</span>
          <span>{t("{a} of {b} done", { a: doneCount, b: checkable.length })}</span>
        </div>
        <div role="progressbar" aria-labelledby="buddy-prog" aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="h-2 overflow-hidden rounded-full bg-surface2">
          <div className="h-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {cur && (
        <div className="mb-6 rounded-[1.5rem] border border-nowline bg-now p-6" aria-current="step">
          <p className="mb-1 text-sm font-bold uppercase tracking-widest text-accent">{t("Right now")}</p>
          <p className="text-2xl font-bold break-words">{t(cur.b.topic ?? (cur.b.type === "break" ? "Break" : cur.b.type))}</p>
          <p className="tnum text-4xl font-bold">{countdown(cur.b.endMs - now)} <span className="text-lg font-normal text-muted">{t("left")}</span></p>
        </div>
      )}

      <div className="card">
        <ol>
          {rows.map(({ b, i }) => (
            <li key={i} className="grid grid-cols-[3.5rem_1.5rem_1fr_auto] items-start gap-x-3 border-t border-line py-4 first:border-t-0">
              <span className="tnum pt-0.5 font-mono text-sm text-muted">{b.start}</span>
              <span className="flex justify-center pt-2"><span className="dot" style={{ background: DOT[b.type] }} aria-hidden="true" /></span>
              <div className="min-w-0">
                <p className={`font-semibold break-words ${done[i] ? "line-through opacity-70" : ""}`}>
                  {b.type === "sleep" ? t("Sleep") : t(b.topic ?? "Break")}
                  <span className="ml-2 text-sm font-normal text-muted">{compactDuration(Math.round((b.endMs - b.startMs) / 60000))}</span>
                </p>
                <p className="text-muted">{t(b.tip)}</p>
              </div>
              {b.type !== "sleep" && (
                <span className={`pt-1 text-lg ${done[i] ? "text-good" : "text-muted"}`} role="img" aria-label={done[i] ? t("Done") : t("Not done yet")}>
                  {done[i] ? "✓" : "○"}
                </span>
              )}
            </li>
          ))}
        </ol>
      </div>
      <p className="mt-6 text-center text-muted">{t("Studying alongside? Open a video call and keep this page next to it.")}</p>
    </section>
  );
}

function LoadingFallback() {
  const t = useT();
  return <p className="text-muted" role="status">{t("Loading...")}</p>;
}

export default function BuddyPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <BuddyView />
    </Suspense>
  );
}
