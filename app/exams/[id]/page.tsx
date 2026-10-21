"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import FlashcardsTab from "@/components/FlashcardsTab";
import NotesTab from "@/components/NotesTab";
import QuizTab from "@/components/QuizTab";
import { getExam, type ExamRow } from "@/lib/exams";

const TABS = ["Notes", "Flashcards", "Quiz"] as const;

function ExamView() {
  const { id } = useParams<{ id: string }>();
  const { user, ready, configured } = useAuth();
  const router = useRouter();
  const [exam, setExam] = useState<ExamRow | null | undefined>(undefined);
  const [tab, setTab] = useState<(typeof TABS)[number]>("Notes");

  useEffect(() => {
    if (!ready) return;
    if (!configured || !user) {
      router.replace("/login");
      return;
    }
    getExam(id).then(setExam, () => setExam(null));
  }, [ready, user, configured, id, router]);

  if (exam === undefined) return <p className="text-muted" role="status">Loading...</p>;
  if (exam === null) {
    return (
      <section className="mx-auto w-full max-w-2xl">
        <h1 className="mb-2 text-2xl font-bold">We couldn&apos;t find that exam</h1>
        <Link href="/exams" className="font-semibold underline">Back to My exams</Link>
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-2xl">
      <Link href="/exams" className="mb-2 inline-block font-semibold underline">All exams</Link>
      <h1 className="mb-4 text-3xl font-bold break-words">{exam.name}</h1>
      <div role="tablist" aria-label="Study tools" className="mb-4 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            id={`tab-${t}`}
            aria-selected={tab === t}
            aria-controls="panel"
            className={`btn flex-1 ${tab === t ? "border-accent" : ""}`}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </div>
      <div role="tabpanel" id="panel" aria-labelledby={`tab-${tab}`}>
        {tab === "Notes" && <NotesTab exam={exam} />}
        {tab === "Flashcards" && <FlashcardsTab exam={exam} />}
        {tab === "Quiz" && <QuizTab exam={exam} />}
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
