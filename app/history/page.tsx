"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useLang, useT } from "@/lib/i18n";
import { clearHistory, loadHistory, removeHistory, type HistoryEntry } from "@/lib/history";

export default function HistoryPage() {
  const t = useT();
  const lang = useLang();
  const [list, setList] = useState<HistoryEntry[] | null>(null);
  const [nowMs, setNowMs] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read localStorage after mount
    setList(loadHistory());
    setNowMs(Date.now());
  }, []);

  const fmt = (ms: number) => new Date(ms).toLocaleDateString(lang === "hi" ? "hi-IN" : [], { weekday: "short", day: "numeric", month: "short", year: "numeric" });

  return (
    <section className="mx-auto w-full max-w-2xl">
      <h1 className="page-title mb-2">{t("Past exams")}</h1>
      <p className="mb-8 text-lg text-muted">{t("A little record of your exam nights, kept on this device.")}</p>

      {list === null ? (
        <p className="text-muted" role="status">{t("Loading...")}</p>
      ) : list.length === 0 ? (
        <div className="card py-10 text-center">
          <p aria-hidden="true" className="mb-2 text-4xl">📖</p>
          <p className="text-xl font-semibold">{t("No exam nights yet")}</p>
          <p className="mb-4 text-muted">{t("Make your first plan and it will show up here.")}</p>
          <Link href="/" className="btn btn-primary">{t("Make a plan")}</Link>
        </div>
      ) : (
        <>
          <ul className="flex flex-col gap-3">
            {list.map((e) => {
              const pct = e.total ? Math.round((e.done / e.total) * 100) : 0;
              return (
                <li key={e.id} className="card flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-lg font-bold break-words">{e.name}</p>
                      <p className="text-sm text-muted">{t("Exam {date}", { date: fmt(e.examMs) })} · {e.topics === 1 ? t("1 topic") : t("{n} topics", { n: e.topics })}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-3 py-1 text-sm font-bold ${e.examMs > nowMs ? "border-nowline bg-now text-accent" : "border-line text-muted"}`}>
                      {e.examMs > nowMs ? t("Coming up") : t("Done")}
                    </span>
                  </div>
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span id={`h-${e.id}`} className="font-semibold">{t("{a} of {b} blocks completed", { a: e.done, b: e.total })}</span>
                      <span className="text-muted">{pct}%</span>
                    </div>
                    <div role="progressbar" aria-labelledby={`h-${e.id}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="h-2 overflow-hidden rounded-full bg-surface2">
                      <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <div>
                    <button
                      type="button"
                      className="min-h-11 font-semibold text-muted underline hover:text-ink"
                      aria-label={t("Remove {name} from history", { name: e.name })}
                      onClick={() => {
                        removeHistory(e.id);
                        setList(loadHistory());
                      }}
                    >
                      {t("Remove")}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <button
            type="button"
            className="mt-6 min-h-11 font-semibold text-muted underline hover:text-ink"
            onClick={() => {
              if (window.confirm(t("Clear all past exams from this device?"))) {
                clearHistory();
                setList([]);
              }
            }}
          >
            {t("Clear history")}
          </button>
        </>
      )}
    </section>
  );
}
