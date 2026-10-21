"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";

const TOTAL = 60;
const PHASE = 4;

export default function BreathingDialog({ onClose }: { onClose: () => void }) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    ref.current?.showModal();
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (elapsed >= TOTAL) onClose();
  }, [elapsed, onClose]);

  const breatheIn = Math.floor(elapsed / PHASE) % 2 === 0;

  return (
    <dialog
      ref={ref}
      aria-labelledby="breath-title"
      onClose={onClose}
      className="m-auto w-[min(92vw,28rem)] rounded-3xl border border-line bg-surface p-8 text-center text-ink backdrop:bg-black/70"
    >
      <h2 id="breath-title" className="mb-1 text-xl font-bold">{t("Let's slow down for a minute")}</h2>
      <p className="mb-6 text-muted">{t("Your plan will be right here when you're back.")}</p>
      <div className="mx-auto mb-4 flex h-48 w-48 items-center justify-center">
        <div
          aria-hidden="true"
          className="h-48 w-48 rounded-full opacity-80 shadow-[0_0_60px_var(--accent)]" 
          style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))", transform: `scale(${breatheIn ? 1 : 0.5})`, transition: `transform ${PHASE}s ease-in-out` }}
        />
      </div>
      <p role="status" className="mb-1 text-2xl font-bold">{breatheIn ? t("Breathe in...") : t("Breathe out...")}</p>
      <p className="mb-6 text-muted">{t("{n} seconds left", { n: Math.max(0, TOTAL - elapsed) })}</p>
      <button type="button" className="btn btn-primary" autoFocus onClick={onClose}>
        {elapsed >= TOTAL ? t("Back to my plan") : t("I'm ready, back to my plan")}
      </button>
    </dialog>
  );
}
