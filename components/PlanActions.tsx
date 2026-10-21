"use client";

import Link from "next/link";
import { useState } from "react";
import { createShare, stopShare } from "@/lib/buddy";
import { useT } from "@/lib/i18n-client";
import { sharePlanImage } from "@/lib/shareImage";
import { saveExam, scheduleReminders } from "@/lib/exams";
import { downloadIcs } from "@/lib/ics";
import { enablePush } from "@/lib/push";
import type { AppState } from "@/lib/storage";
import { useAuth } from "./AuthProvider";

export default function PlanActions({
  state,
  onSaved,
  onShare,
}: {
  state: AppState;
  onSaved: (id: string, name: string) => void;
  onShare: (code: string | null) => void;
}) {
  const { user, configured } = useAuth();
  const t = useT();
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
      setErr(t(e instanceof Error ? e.message : "Something went wrong. Please try again."));
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
    <div className="no-print flex flex-col gap-3">
      <button type="button" className="btn w-full" onClick={() => downloadIcs(plan.blocks, state.examName || "Exam revision")}>
        {t("Add to calendar (.ics)")}
      </button>
      <button
        type="button"
        className="btn w-full"
        disabled={busy}
        onClick={() =>
          run(async () => ((await sharePlanImage(plan, state.examName || "", t)) === "shared" ? t("Shared.") : t("Saved a picture of your plan to your device.")))
        }
      >
        {t("Share plan (picture)")}
      </button>

      {configured && !user && (
        <p>
          <Link href="/login" className="inline-flex min-h-11 items-center font-semibold underline">{t("Sign in")}</Link> {t("to save this exam and get notes, flashcards, quizzes and reminders.")}
        </p>
      )}

      {configured && user && (
        <>
          <div className="flex flex-col gap-1">
            <label htmlFor="exam-name" className="text-sm font-semibold text-muted">{t("Exam name")}</label>
            <div className="flex gap-2">
              <input id="exam-name" className="input min-w-0 flex-1" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder={t("e.g. Physics final")} />
              <button type="button" className="btn btn-primary" disabled={busy} onClick={() => run(async () => { await save(); return t("Saved to My exams."); })}>
                {state.examId ? t("Update") : t("Save")}
              </button>
            </div>
          </div>
          <button
              type="button"
              className="btn w-full"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  const id = await save();
                  await enablePush(user);
                  const n = await scheduleReminders(user, id, name.trim(), plan);
                  return n ? t("Done. We'll nudge you before {n} upcoming blocks.", { n }) : t("Done, but no upcoming blocks are left to remind you about.");
                })
              }
            >
              {t("Remind me before each block")}
            </button>
          <div className="flex flex-col gap-2">
            {state.shareCode ? (
              <>
                <label htmlFor="share-link" className="text-sm font-semibold text-muted">{t("Study buddy link (live)")}</label>
                <input
                  id="share-link"
                  className="input"
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/buddy/${state.shareCode}`}
                  onFocus={(e) => e.currentTarget.select()}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn flex-1"
                    onClick={() =>
                      navigator.clipboard
                        .writeText(`${window.location.origin}/buddy/${state.shareCode}`)
                        .then(() => setMsg(t("Link copied. Send it to a friend.")), () => setErr(t("Couldn't copy. Select the link and copy it.")))
                    }
                  >
                    {t("Copy link")}
                  </button>
                  <button type="button" className="btn" disabled={busy} onClick={() => run(async () => { await stopShare(state.shareCode!); onShare(null); return t("Sharing stopped."); })}>
                    {t("Stop sharing")}
                  </button>
                </div>
              </>
            ) : (
              <button
                type="button"
                className="btn w-full"
                disabled={busy}
                onClick={() => run(async () => { onShare(await createShare(user, plan, state.examName || name.trim() || "My plan")); return t("Link ready. Send it to a friend."); })}
              >
                {t("Study with a friend (live link)")}
              </button>
            )}
          </div>
          {state.examId && <Link href={`/exams/${state.examId}`} className="btn w-full">{t("Notes, flashcards, quiz")}</Link>}
        </>
      )}
      <p aria-live="polite" className={err ? "text-danger" : "text-good"}>{err || msg}</p>
    </div>
  );
}
