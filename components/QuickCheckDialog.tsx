"use client";

import { useEffect, useRef, useState } from "react";
import { useLang, useT } from "@/lib/i18n";

interface Q {
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

/** Two quick AI questions after a study block. Reports how many were wrong. */
export default function QuickCheckDialog({
  topic,
  subject,
  onFinish,
  onClose,
}: {
  topic: string;
  subject: string;
  onFinish: (wrong: number) => void;
  onClose: () => void;
}) {
  const t = useT();
  const lang = useLang();
  const ref = useRef<HTMLDialogElement>(null);
  const [qs, setQs] = useState<Q[] | null>(null);
  const [err, setErr] = useState("");
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [wrong, setWrong] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    ref.current?.showModal();
    fetch("/api/quickcheck", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ topic, subject, lang }),
    })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        setQs(j.questions as Q[]);
      })
      .catch((e) => setErr(t(e instanceof Error && e.message ? e.message : "Couldn't make a quick check right now.")));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once per topic; `t` only changes with the language
  }, [topic, subject, lang]);

  const q = qs?.[i];
  const last = qs ? i + 1 >= qs.length : false;

  const next = () => {
    if (last) {
      setFinished(true);
      onFinish(wrong);
    } else {
      setI(i + 1);
      setPicked(null);
    }
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby="qc-title"
      onClose={onClose}
      className="m-auto w-[min(92vw,34rem)] rounded-3xl border border-line bg-surface p-6 text-ink backdrop:bg-black/60 sm:p-8"
    >
      <p className="mb-1 text-sm font-bold uppercase tracking-widest text-accent">{t("Quick check")}</p>
      <h2 id="qc-title" className="mb-4 text-2xl font-bold break-words">{topic}</h2>

      {err ? (
        <>
          <p role="alert" className="mb-4 text-muted">{err} {t("You can skip it. Your progress is saved.")}</p>
          <button type="button" className="btn" autoFocus onClick={() => ref.current?.close()}>{t("Close")}</button>
        </>
      ) : !qs ? (
        <p role="status" className="text-muted">{t("Getting two quick questions...")}</p>
      ) : finished ? (
        <>
          <p className="mb-2 text-xl font-semibold">
            {wrong === 0 ? t("Nice, you've got this one.") : wrong === qs.length ? t("That one needs another look.") : t("Almost there.")}
          </p>
          <p className="mb-5 text-muted">
            {wrong === 0
              ? t("On to the next block.")
              : t("We've marked it as shaky and added a 10-minute revisit to your plan if there's room.")}
          </p>
          <button type="button" className="btn btn-primary" autoFocus onClick={() => ref.current?.close()}>{t("Back to my plan")}</button>
        </>
      ) : (
        q && (
          <>
            <p className="mb-3 text-sm text-muted">{t("Question {a} of {b}", { a: i + 1, b: qs.length })}</p>
            <fieldset>
              <legend className="mb-3 text-lg font-semibold">{q.question}</legend>
              <div className="flex flex-col gap-2">
                {q.options.map((o, n) => {
                  const state = picked === null ? "" : n === q.answer ? "correct" : n === picked ? "wrong" : "";
                  return (
                    <label key={n} className={`seg ${state === "correct" ? "seg-know" : state === "wrong" ? "seg-noidea" : ""}`}>
                      <input
                        type="radio"
                        className="sr-only"
                        name={`qc-${i}`}
                        disabled={picked !== null}
                        checked={picked === n}
                        onChange={() => {
                          setPicked(n);
                          if (n !== q.answer) setWrong((w) => w + 1);
                        }}
                      />
                      <span>
                        {o}
                        {state === "correct" && <strong className="text-good"> {t("(correct)")}</strong>}
                        {state === "wrong" && <strong className="text-bad"> {t("(not quite)")}</strong>}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            {picked !== null && (
              <>
                <p aria-live="polite" className="mt-3 text-muted">{q.explanation}</p>
                <div className="mt-4 flex justify-end">
                  <button type="button" className="btn btn-primary" autoFocus onClick={next}>{last ? t("Finish") : t("Next question")}</button>
                </div>
              </>
            )}
          </>
        )
      )}
      {!err && !finished && qs && (
        <button type="button" className="mt-4 min-h-11 text-sm font-semibold text-muted underline" onClick={() => ref.current?.close()}>{t("Skip the check")}</button>
      )}
    </dialog>
  );
}
