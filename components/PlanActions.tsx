"use client";

import Link from "next/link";
import { useState } from "react";
import { saveExam, scheduleReminders } from "@/lib/exams";
import { downloadIcs } from "@/lib/ics";
import { enablePush } from "@/lib/push";
import type { AppState } from "@/lib/storage";
import { useAuth } from "./AuthProvider";

export default function PlanActions({
  state,
  onSaved,
}: {
  state: AppState;
  onSaved: (id: string, name: string) => void;
}) {
  const { user, configured } = useAuth();
  const [name, setName] = useState(state.examName ?? "");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const plan = state.plan!;

  const run = async (fn: () => Promise<string>) => {
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      setMsg(await fn());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong. Please try again.");
    }
    setBusy(false);
  };

  const save = async () => {
    const n = name.trim();
    if (!n) throw new Error("Give this exam a name first, like \"Physics final\".");
    const id = await saveExam(user!, state, n);
    onSaved(id, n);
    return id;
  };

  return (
    <div className="no-print card mb-6 flex flex-col gap-4">
      <h2 className="text-xl font-bold">Take your plan with you</h2>
      <div>
        <button type="button" className="btn" onClick={() => downloadIcs(plan.blocks, state.examName || "Exam revision")}>
          Add to calendar (.ics)
        </button>
        <p className="mt-1 text-sm text-muted">Works with Google Calendar, Apple Calendar and Outlook.</p>
      </div>

      {configured && !user && (
        <p>
          <Link href="/login" className="font-semibold underline">Sign in</Link> to save this exam and get notes, flashcards, quizzes and reminders.
        </p>
      )}

      {configured && user && (
        <>
          <div className="flex flex-col gap-1">
            <label htmlFor="exam-name" className="font-semibold">Exam name</label>
            <div className="flex flex-wrap gap-2">
              <input id="exam-name" className="input min-w-0 flex-1" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="e.g. Physics final" />
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => run(async () => { await save(); return "Saved to My exams."; })}>
                {state.examId ? "Update saved exam" : "Save to my exams"}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="btn"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const id = await save();
                  await enablePush(user);
                  const n = await scheduleReminders(user, id, name.trim(), plan);
                  return n ? `Done. We'll nudge you before ${n} upcoming blocks.` : "Done, but no upcoming blocks are left to remind you about.";
                })
              }
            >
              Remind me before each block
            </button>
            {state.examId && <Link href={`/exams/${state.examId}`} className="font-semibold underline">Notes, flashcards and quiz</Link>}
          </div>
        </>
      )}
      <p aria-live="polite" className={err ? "text-danger" : "text-good"}>{err || msg}</p>
    </div>
  );
}
