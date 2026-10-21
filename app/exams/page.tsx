"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { deleteExam, listExams, type ExamRow } from "@/lib/exams";
import { clearState, saveState } from "@/lib/storage";
import { defaultTiming } from "@/lib/timing";
import { toLocalMin } from "@/lib/time";

export default function ExamsPage() {
  const { user, ready, configured } = useAuth();
  const router = useRouter();
  const [exams, setExams] = useState<ExamRow[] | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!ready) return;
    if (!configured || !user) {
      router.replace("/login");
      return;
    }
    listExams().then(setExams, () => setErr("Couldn't load your exams. Please refresh."));
  }, [ready, user, configured, router]);

  const open = (e: ExamRow) => {
    saveState({ stage: e.plan ? "plan" : "topics", timing: e.timing, topics: e.topics, plan: e.plan, examId: e.id, examName: e.name });
    router.push("/");
  };

  const newExam = () => {
    clearState();
    saveState({ stage: "timing", timing: defaultTiming(toLocalMin(new Date())), topics: [], plan: null, examId: null });
    router.push("/");
  };

  const remove = async (e: ExamRow) => {
    if (!window.confirm(`Delete "${e.name}" and its notes, flashcards and quiz?`)) return;
    try {
      await deleteExam(e.id);
      setExams((xs) => xs?.filter((x) => x.id !== e.id) ?? null);
    } catch {
      setErr("Couldn't delete that exam. Please try again.");
    }
  };

  return (
    <section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">My exams</h1>
        <button type="button" className="btn btn-primary" onClick={newExam}>New exam</button>
      </div>
      <p role="alert" className="text-danger empty:hidden">{err}</p>
      {exams === null && !err ? (
        <p className="text-muted" role="status">Loading...</p>
      ) : exams?.length === 0 ? (
        <div className="card text-center">
          <p className="text-xl font-semibold">No saved exams yet</p>
          <p className="text-muted">Make a plan, then press &quot;Save to my exams&quot;.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {exams?.map((e) => (
            <li key={e.id} className="card flex flex-col gap-3">
              <div>
                <p className="text-lg font-semibold break-words">{e.name}</p>
                <p className="text-sm text-muted">
                  Exam {e.timing.examAt.replace("T", " at ")} · {e.topics.length} topics
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn" onClick={() => open(e)}>Open plan</button>
                <Link href={`/exams/${e.id}`} className="btn">Notes, flashcards, quiz</Link>
                <button type="button" className="btn" onClick={() => remove(e)} aria-label={`Delete ${e.name}`}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
