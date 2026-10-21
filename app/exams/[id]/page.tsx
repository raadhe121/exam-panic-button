"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import FlashcardsTab from "@/components/FlashcardsTab";
import NotesTab from "@/components/NotesTab";
import QuizTab from "@/components/QuizTab";
import { getExam, type ExamRow } from "@/lib/exams";
import { useLang, useT, type TFn } from "@/lib/i18n";
import { getSupabase } from "@/lib/supabase";
import { inputToMin, toLocalMin } from "@/lib/time";
import { shortDate } from "@/lib/timing";

const TABS = ["Notes", "Flashcards", "Quiz"] as const;
type Tab = (typeof TABS)[number];
type Counts = Record<Tab, number | null>;
const TABLE: Record<Tab, string> = { Notes: "notes", Flashcards: "flashcards", Quiz: "quiz_questions" };

function inLabel(mins: number, t: TFn) {
  if (mins < 60) return t("in {n} min", { n: Math.max(1, mins) });
  if (mins < 48 * 60) return t("in {n} h", { n: Math.round(mins / 60) });
  return t("in {n} days", { n: Math.round(mins / 1440) });
}

function ExamView() {
  const { id } = useParams<{ id: string }>();
  const { user, ready, configured } = useAuth();
  const t = useT();
  const lang = useLang();
  const router = useRouter();
  const [exam, setExam] = useState<ExamRow | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>("Notes");
  const [counts, setCounts] = useState<Counts>({ Notes: null, Flashcards: null, Quiz: null });

  useEffect(() => {
    if (!ready) return;
    if (!configured || !user) {
      router.replace("/login");
      return;
    }
    getExam(id).then(setExam, () => setExam(null));
    const sb = getSupabase()!;
    for (const name of TABS) {
      sb.from(TABLE[name]).select("id", { count: "exact", head: true }).eq("exam_id", id).then(({ count }) => {
        setCounts((c) => ({ ...c, [name]: count ?? 0 }));
      });
    }
  }, [ready, user, configured, id, router]);

  const setCount = (name: Tab) => (n: number) => setCounts((c) => (c[name] === n ? c : { ...c, [name]: n }));

  if (exam === undefined) return <p className="text-muted" role="status">{t("Loading...")}</p>;
  if (exam === null) {
    return (
      <section className="mx-auto w-full max-w-2xl">
        <h1 className="page-title mb-2">{t("We couldn't find that exam")}</h1>
        <Link href="/exams" className="font-semibold underline">{t("Back to My exams")}</Link>
      </section>
    );
  }

  const examMin = inputToMin(exam.timing.examAt);
  const left = examMin !== null ? examMin - toLocalMin(new Date()) : null;
  const subject = exam.topics.find((tp) => tp.subject)?.subject;
  const sub = [subject, examMin !== null ? t("Exam {date}", { date: `${shortDate(examMin, lang)}, ${exam.timing.examAt.split("T")[1]}` }) : null].filter(Boolean).join(" · ");

  return (
    <section className="mx-auto w-full max-w-2xl">
      <Link href="/exams" className="mb-6 inline-flex min-h-11 items-center gap-1 font-semibold text-muted hover:text-ink">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        {t("All exams")}
      </Link>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="page-title mb-2 break-words">{exam.name}</h1>
          {sub && <p className="text-lg text-muted">{sub}</p>}
        </div>
        {left !== null && left > 0 && (
          <span className="shrink-0 rounded-full border border-nowline bg-now px-4 py-1.5 text-sm font-bold text-accent">{inLabel(left, t)}</span>
        )}
      </div>
      <div role="tablist" aria-label={t("Study tools")} className="tablist mb-6">
        {TABS.map((name) => (
          <button
            key={name}
            role="tab"
            id={`tab-${name}`}
            aria-selected={tab === name}
            aria-controls="panel"
            className="tab"
            onClick={() => setTab(name)}
          >
            {t(name)}
            {counts[name] ? <span className="count"> {counts[name]}</span> : null}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="panel" aria-labelledby={`tab-${tab}`}>
        {tab === "Notes" && <NotesTab exam={exam} onCount={setCount("Notes")} />}
        {tab === "Flashcards" && <FlashcardsTab exam={exam} onCount={setCount("Flashcards")} />}
        {tab === "Quiz" && <QuizTab exam={exam} onCount={setCount("Quiz")} />}
      </div>
    </section>
  );
}

function LoadingFallback() {
  const t = useT();
  return <p className="text-muted" role="status">{t("Loading...")}</p>;
}

export default function ExamPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ExamView />
    </Suspense>
  );
}
