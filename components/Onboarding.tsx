"use client";

import { useEffect, useRef, useState } from "react";
import { useT } from "@/lib/i18n";

const CARDS = [
  { icon: "🌙", title: "Panicking? Start here.", text: "Tell us when your exam is and what you still don't know. That's all we need." },
  { icon: "🗓️", title: "Get a calm plan for tonight", text: "Hardest topics first, breaks built in, a final quick revision, and your sleep always protected." },
  { icon: "✅", title: "Follow it one block at a time", text: "See what's Now, tick things off, and tap \"I'm behind\" if the night slips. We'll re-plan." },
];

export const ONBOARD_KEY = "epb:onboarded";

export default function Onboarding({ onDone }: { onDone: () => void }) {
  const t = useT();
  const ref = useRef<HTMLDialogElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  const finish = () => {
    try {
      localStorage.setItem(ONBOARD_KEY, "1");
    } catch {
      /* ignore */
    }
    ref.current?.close();
    onDone();
  };

  const go = (n: number) => {
    const t = track.current;
    if (!t) return;
    t.scrollTo({ left: n * t.clientWidth, behavior: "smooth" });
    setI(n);
  };

  const last = i === CARDS.length - 1;

  return (
    <dialog
      ref={ref}
      aria-labelledby="onb-title"
      onCancel={(e) => {
        e.preventDefault();
        finish();
      }}
      className="m-auto w-[min(94vw,30rem)] overflow-hidden rounded-3xl border border-line bg-surface p-0 text-ink backdrop:bg-black/70"
    >
      <div className="flex justify-end px-4 pt-3">
        <button type="button" className="min-h-11 px-3 font-semibold text-muted hover:text-ink" onClick={finish}>{t("Skip")}</button>
      </div>
      <div
        ref={track}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none]"
        onScroll={(e) => {
          const t = e.currentTarget;
          setI(Math.round(t.scrollLeft / t.clientWidth));
        }}
        tabIndex={0}
        aria-label={t("Introduction, swipe or use the buttons")}
      >
        {CARDS.map((c, n) => (
          <div key={c.title} className="w-full shrink-0 snap-center px-8 pb-4 text-center" aria-hidden={n !== i}>
            <p aria-hidden="true" className="mb-4 text-6xl">{c.icon}</p>
            <h2 id={n === 0 ? "onb-title" : undefined} className="mb-2 text-2xl font-extrabold tracking-tight">{t(c.title)}</h2>
            <p className="text-lg text-muted">{t(c.text)}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 p-6">
        <div className="flex gap-2" role="presentation">
          {CARDS.map((c, n) => (
            <span key={c.title} aria-hidden="true" className={`h-2 rounded-full transition-all ${n === i ? "w-6 bg-accent" : "w-2 bg-line"}`} />
          ))}
        </div>
        <div className="flex gap-2">
          {i > 0 && <button type="button" className="btn" onClick={() => go(i - 1)}>{t("Back")}</button>}
          <button type="button" className="btn btn-primary" autoFocus onClick={() => (last ? finish() : go(i + 1))}>
            {last ? t("Get started") : t("Next")}
          </button>
        </div>
      </div>
    </dialog>
  );
}
