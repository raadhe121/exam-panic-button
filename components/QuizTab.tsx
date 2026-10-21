"use client";

import { useEffect, useState } from "react";
import { accessToken, type ExamRow } from "@/lib/exams";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";

interface Question {
  id: string;
  topic: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

export default function QuizTab({ exam, onCount }: { exam: ExamRow; onCount?: (n: number) => void }) {
  const { user } = useAuth();
  const sb = getSupabase()!;
  const [qs, setQs] = useState<Question[] | null>(null);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    sb.from("quiz_questions").select("id,topic,question,options,answer,explanation").eq("exam_id", exam.id).order("created_at").then(({ data, error }) => {
      if (error) setErr("Couldn't load the quiz.");
      else setQs(data as Question[]);
    });
  }, [sb, exam.id]);

  useEffect(() => {
    if (qs) onCount?.(qs.length);
  }, [qs, onCount]);

  const generate = async () => {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${await accessToken()}` },
        body: JSON.stringify({ topics: exam.topics.map((t) => ({ name: t.name, subject: t.subject })) }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      const rows = (j.questions as Omit<Question, "id">[]).map((q) => ({ ...q, user_id: user!.id, exam_id: exam.id }));
      const { data, error } = await sb.from("quiz_questions").insert(rows).select("id,topic,question,options,answer,explanation");
      if (error) throw error;
      setQs((c) => [...(c ?? []), ...(data as Question[])]);
    } catch (e) {
      setErr(e instanceof Error && e.message ? e.message : "Couldn't make a quiz right now.");
    }
    setBusy(false);
  };

  const restart = () => {
    setI(0);
    setPicked(null);
    setScore(0);
    setFinished(false);
  };

  const q = qs?.[i];

  return (
    <div className="flex flex-col gap-4">
      {qs === null ? <p className="text-muted" role="status">Loading...</p> : qs.length === 0 ? (
        <div className="card py-10 text-center">
          <p aria-hidden="true" className="mb-2 text-4xl">🧠</p>
          <p className="text-xl font-semibold">No quiz yet</p>
          <p className="mb-3 text-muted">AI will write a few practice questions for each topic.</p>
          <button type="button" className="btn btn-primary" onClick={generate} disabled={busy}>
            {busy ? "Writing questions..." : "Make a quiz with AI"}
          </button>
        </div>
      ) : finished ? (
        <div className="card py-10 text-center">
          <p aria-hidden="true" className="mb-2 text-4xl">🎉</p>
          <p className="text-2xl font-bold">You got {score} of {qs.length}</p>
          <p className="mb-3 text-muted">Every round makes the next one easier.</p>
          <button type="button" className="btn btn-primary" onClick={restart}>Try again</button>
        </div>
      ) : q && (
        <div className="card flex flex-col gap-3">
          <p className="text-sm text-muted">Question {i + 1} of {qs.length}{q.topic ? ` · ${q.topic}` : ""}</p>
          <fieldset>
            <legend className="mb-3 text-lg font-semibold">{q.question}</legend>
            <div className="flex flex-col gap-2">
              {q.options.map((o, n) => {
                const state = picked === null ? "" : n === q.answer ? "correct" : n === picked ? "wrong" : "";
                return (
                  <label key={n} className={`seg ${state === "correct" ? "seg-know" : state === "wrong" ? "seg-noidea" : ""}`} style={state ? { borderColor: state === "correct" ? "var(--good)" : "var(--bad)" } : undefined}>
                    <input
                      type="radio"
                      className="sr-only"
                      name={`q-${q.id}`}
                      disabled={picked !== null}
                      checked={picked === n}
                      onChange={() => {
                        setPicked(n);
                        if (n === q.answer) setScore((s) => s + 1);
                      }}
                    />
                    <span>
                      {o}
                      {state === "correct" && <strong className="text-good"> (correct)</strong>}
                      {state === "wrong" && <strong className="text-bad"> (not quite)</strong>}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          {picked !== null && (
            <>
              <p aria-live="polite" className="text-muted">{q.explanation}</p>
              <div className="flex justify-end">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => (i + 1 >= qs.length ? setFinished(true) : (setI(i + 1), setPicked(null)))}
                >
                  {i + 1 >= qs.length ? "See my score" : "Next question"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
      {qs && qs.length > 0 && !finished && (
        <button type="button" className="btn self-start" onClick={generate} disabled={busy}>{busy ? "Writing questions..." : "Add more questions with AI"}</button>
      )}
      <p role="alert" className="text-danger empty:hidden">{err}</p>
    </div>
  );
}
