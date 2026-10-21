"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import FlashcardsTab from "@/components/FlashcardsTab";
import NotesTab from "@/components/NotesTab";
import QuizTab from "@/components/QuizTab";
import { getExam, type ExamRow } from "@/lib/exams";
import { getSupabase } from "@/lib/supabase";
import { inputToMin, toLocalMin } from "@/lib/time";
import { shortDate } from "@/lib/timing";

const TABS = ["Notes", "Flashcards", "Quiz"] as const;
type Tab = (typeof TABS)[number];
type Counts = Record<Tab, number | null>;
const TABLE: Record<Tab, string> = { Notes: "notes", Flashcards: "flashcards", Quiz: "quiz_questions" };

function inLabel(mins: number) {
  if (mins < 60) return `in ${Math.max(1, mins)} min`;
  if (mins < 48 * 60) return `in ${Math.round(mins / 60)} h`;
  return `in ${Math.round(mins / 1440)} days`;
}

function ExamView() {
  const { id } = useParams<{ id: string }>();
  const { user, ready, configured } = useAuth();
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
    for (const t of TABS) {
      sb.from(TABLE[t]).select("id", { count: "exact", head: true }).eq("exam_id", id).then(({ count }) => {
        setCounts((c) => ({ ...c, [t]: count ?? 0 }));
      });
    }
  }, [ready, user, configured, id, router]);

  const setCount = (t: Tab) => (n: number) => setCounts((c) => (c[t] === n ? c : { ...c, [t]: n }));

  if (exam === undefined) return <p className="text-muted" role="status">Loading...</p>;
  if (exam === null) {
    return (
      <section className="mx-auto w-full max-w-2xl">
        <h1 className="page-title mb-2">We couldn&apos;t find that exam</h1>
        <Link href="/exams" className="font-semibold underline">Back to My exams</Link>
      </section>
    );
  }

  const examMin = inputToMin(exam.timing.examAt);
  const left = examMin !== null ? examMin - toLocalMin(new Date()) : null;
  const subject = exam.topics.find((t) => t.subject)?.subject;
  const sub = [subject, examMin !== null ? `Exam ${shortDate(examMin)}, ${exam.timing.examAt.split("T")[1]}` : null].filter(Boolean).join(" · ");

  return (
    <section className="mx-auto w-full max-w-2xl">
      <Link href="/exams" className="mb-6 inline-flex min-h-11 items-center gap-1 font-semibold text-muted hover:text-ink">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
        All exams
      </Link>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="page-title mb-2 break-words">{exam.name}</h1>
          {sub && <p className="text-lg text-muted">{sub}</p>}
        </div>
        {left !== null && left > 0 && (
          <span className="shrink-0 rounded-full border border-nowline bg-now px-4 py-1.5 text-sm font-bold text-accent">{inLabel(left)}</span>
        )}
      </div>
      <div role="tablist" aria-label="Study tools" className="tablist mb-6">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            id={`tab-${t}`}
            aria-selected={tab === t}
            aria-controls="panel"
            className="tab"
            onClick={() => setTab(t)}
          >
            {t}
            {counts[t] ? <span className="count"> {counts[t]}</span> : null}
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

export default function ExamPage() {
  return (
    <Suspense fallback={<p className="text-muted" role="status">Loading...</p>}>
      <ExamView />
    </Suspense>
  );
}
