"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useT } from "@/lib/i18n-client";
import { deleteExam, listExams, type ExamRow } from "@/lib/exams";
import { saveState } from "@/lib/storage";

export default function ExamsPage() {
  const t = useT();
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
    listExams().then(setExams, () => setErr(t("Couldn't load your exams. Please refresh.")));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per sign-in; `t` is only for the error text
  }, [ready, user, configured, router]);

  const open = (e: ExamRow) => {
    saveState({ stage: e.plan ? "plan" : "topics", timing: e.timing, topics: e.topics, plan: e.plan, examId: e.id, examName: e.name });
    router.push("/?open=1");
  };

  const newExam = () => {
    router.push("/?new=1");
  };

  const remove = async (e: ExamRow) => {
    if (!window.confirm(t("Delete \"{name}\" and its notes, flashcards and quiz?", { name: e.name }))) return;
    try {
      await deleteExam(e.id);
      setExams((xs) => xs?.filter((x) => x.id !== e.id) ?? null);
    } catch {
      setErr(t("Couldn't delete that exam. Please try again."));
    }
  };

  return (
    <section className="mx-auto w-full max-w-2xl">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title"><span aria-hidden="true">🎒 </span>{t("My exams")}</h1>
        <button type="button" className="btn btn-primary" onClick={newExam}>{t("New exam")}</button>
      </div>
      <p role="alert" className="text-danger empty:hidden">{err}</p>
      {exams === null && !err ? (
        <p className="text-muted" role="status">{t("Loading...")}</p>
      ) : exams?.length === 0 ? (
        <div className="card py-10 text-center">
          <p aria-hidden="true" className="mb-2 text-4xl">🌱</p>
          <p className="text-xl font-semibold">{t("No saved exams yet")}</p>
          <p className="text-muted">{t("Make a plan, then press \"Save\" under \"Take it with you\".")}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {exams?.map((e) => (
            <li key={e.id} className="card flex flex-col gap-3">
              <div>
                <p className="text-lg font-semibold break-words">{e.name}</p>
                <p className="text-sm text-muted">
                  {t("Exam {date}", { date: e.timing.examAt.replace("T", " · ") })} · {t("{n} topics", { n: e.topics.length })}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" className="btn" onClick={() => open(e)}>{t("Open plan")}</button>
                <Link href={`/exams/${e.id}`} className="btn">{t("Notes, flashcards, quiz")}</Link>
                <button type="button" className="btn" onClick={() => remove(e)} aria-label={t("Delete {name}", { name: e.name })}>{t("Delete")}</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
