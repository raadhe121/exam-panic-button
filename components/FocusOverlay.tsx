"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";

function clock(ms: number) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const p = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${p(m)}:${p(s % 60)}` : `${p(m)}:${p(s % 60)}`;
}

/**
 * Full-screen focus view: only the topic and a timer. Leaving the tab pauses the timer;
 * coming back asks "Back to <topic>?" before it resumes.
 */
export default function FocusOverlay({
  topic,
  initialMs,
  onClose,
}: {
  topic: string;
  initialMs: number;
  onClose: () => void;
}) {
  const t = useT();
  const [left, setLeft] = useState(initialMs);
  const [away, setAway] = useState(false);
  const [awayMs, setAwayMs] = useState(0);
  const awaySince = useRef<number | null>(null);
  const hidden = useRef(false);
  const paused = useRef(false);

  useEffect(() => {
    const onVis = () => {
      if (document.hidden) {
        hidden.current = true;
        paused.current = true;
        awaySince.current = Date.now();
      } else if (hidden.current) {
        hidden.current = false;
        setAwayMs(awaySince.current ? Date.now() - awaySince.current : 0);
        setAway(true);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    const id = setInterval(() => {
      if (!paused.current) setLeft((l) => Math.max(0, l - 1000));
    }, 1000);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      clearInterval(id);
    };
  }, []);

  const resume = () => {
    paused.current = false;
    setAway(false);
  };

  const done = left <= 0;

  return (
    <div role="dialog" aria-modal="true" aria-label={t("Focus mode: {topic}", { topic })} className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-bg p-6 text-center">
      {away ? (
        <>
          <h2 className="text-3xl font-bold sm:text-5xl">{t("Back to {topic}?", { topic })}</h2>
          <p className="text-lg text-muted">
            {t("Your timer paused while you were away ({n}s). No worries, it happens.", { n: Math.max(1, Math.round(awayMs / 1000)) })}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <button type="button" className="btn btn-primary text-lg" autoFocus onClick={resume}>{t("Yes, keep going")}</button>
            <button type="button" className="btn" onClick={onClose}>{t("Leave focus mode")}</button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm font-bold uppercase tracking-widest text-accent">{t("Focus")}</p>
          <h2 className="max-w-3xl text-4xl font-extrabold tracking-tight break-words sm:text-6xl">{topic}</h2>
          <p className="tnum text-7xl font-bold tracking-tight sm:text-9xl" role="timer" aria-label={t("Time left")}>{clock(left)}</p>
          <p className="text-muted">{done ? t("Block finished. Well done.") : t("Switching tabs pauses the timer.")}</p>
          <button type="button" className="btn" autoFocus onClick={onClose}>{done ? t("Done") : t("Leave focus mode")}</button>
        </>
      )}
    </div>
  );
}
