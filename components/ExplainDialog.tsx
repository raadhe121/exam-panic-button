"use client";

import { useEffect, useRef, useState } from "react";
import { useLang, useT } from "@/lib/i18n";

interface Explain {
  bullets: string[];
  trick: string;
}

/** "Explain it fast": five bullets and a memory trick for one topic, when you're stuck. */
export default function ExplainDialog({ topic, subject, onClose }: { topic: string; subject: string; onClose: () => void }) {
  const t = useT();
  const lang = useLang();
  const ref = useRef<HTMLDialogElement>(null);
  const [data, setData] = useState<Explain | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    ref.current?.showModal();
    fetch("/api/explain", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ topic, subject, lang }),
    })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        setData(j as Explain);
      })
      .catch((e) => setErr(t(e instanceof Error && e.message ? e.message : "Couldn't explain that right now.")));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch once per topic; `t` only changes with the language
  }, [topic, subject, lang]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="ex-title"
      onClose={onClose}
      className="m-auto w-[min(92vw,36rem)] rounded-3xl border border-line bg-surface p-6 text-ink backdrop:bg-black/60 sm:p-8"
    >
      <p className="mb-1 text-sm font-bold uppercase tracking-widest text-accent">{t("Explain it fast")}</p>
      <h2 id="ex-title" className="mb-4 text-2xl font-bold break-words">{topic}</h2>
      {err ? (
        <p role="alert" className="mb-4 text-muted">{err}</p>
      ) : !data ? (
        <p role="status" className="mb-4 text-muted">{t("Pulling out the key points...")}</p>
      ) : (
        <>
          <ul className="mb-4 flex flex-col gap-3">
            {data.bullets.map((b) => (
              <li key={b} className="flex gap-3">
                <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" />
                <span className="text-lg">{b}</span>
              </li>
            ))}
          </ul>
          {data.trick && (
            <p className="mb-4 rounded-2xl border border-nowline bg-now px-4 py-3">
              <strong className="text-accent">{t("Memory trick:")} </strong>
              {data.trick}
            </p>
          )}
        </>
      )}
      <button type="button" className="btn btn-primary" autoFocus onClick={() => ref.current?.close()}>{t("Back to my plan")}</button>
    </dialog>
  );
}
