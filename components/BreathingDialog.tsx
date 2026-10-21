"use client";

import { useEffect, useRef, useState } from "react";

const TOTAL = 60;
const PHASE = 4;

export default function BreathingDialog({ onClose }: { onClose: () => void }) {
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
      className="m-auto w-[min(92vw,28rem)] rounded-2xl border-2 border-line bg-surface p-6 text-center text-ink backdrop:bg-black/70"
    >
      <h2 id="breath-title" className="mb-1 text-xl font-bold">Let&apos;s slow down for a minute</h2>
      <p className="mb-6 text-muted">Your plan will be right here when you&apos;re back.</p>
      <div className="mx-auto mb-4 flex h-48 w-48 items-center justify-center">
        <div
          aria-hidden="true"
          className="h-48 w-48 rounded-full bg-accent opacity-80"
          style={{ transform: `scale(${breatheIn ? 1 : 0.5})`, transition: `transform ${PHASE}s ease-in-out` }}
        />
      </div>
      <p role="status" className="mb-1 text-2xl font-bold">{breatheIn ? "Breathe in..." : "Breathe out..."}</p>
      <p className="mb-6 text-muted">{Math.max(0, TOTAL - elapsed)} seconds left</p>
      <button type="button" className="btn btn-primary" autoFocus onClick={onClose}>
        {elapsed >= TOTAL ? "Back to my plan" : "I'm ready, back to my plan"}
      </button>
    </dialog>
  );
}
