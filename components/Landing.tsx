"use client";

import { useT } from "@/lib/i18n";

const STEPS = [
  { icon: "⏰", title: "Tell us your times", text: "When your exam is, when you can start, and when you want to sleep." },
  { icon: "📚", title: "Rate your topics", text: "Mark each one Know it, Shaky or No idea. Paste a syllabus if typing feels like too much." },
  { icon: "🌙", title: "Follow your plan", text: "One calm timeline with breaks, a final revision and your sleep protected." },
];

const PREVIEW = [
  { time: "21:00", title: "Kinetic Energy", note: "Focus on formulas", color: "var(--dot-study)", mins: "50 min" },
  { time: "21:50", title: "Break", note: "Stretch, drink water", color: "var(--dot-break)", mins: "10 min" },
  { time: "22:00", title: "Quick revision", note: "Skim your notes, then stop", color: "var(--dot-rev)", mins: "25 min" },
  { time: "22:30", title: "Sleep until 08:15", note: "Your memory needs it", color: "var(--dot-sleep)", mins: "9 h" },
];

export default function Landing({ onStart }: { onStart: () => void }) {
  const t = useT();
  return (
    <div className="-mx-1 flex flex-col gap-14 py-4 sm:py-10">
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col items-start gap-6">
          <p className="rounded-full border border-line bg-surface px-4 py-1 text-sm font-semibold text-muted">
            <span aria-hidden="true">🌙 </span>{t("Calm help for the night before")}
          </p>
          <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            {t("Exam tomorrow?")}
            <br />
            <span className="gradient-text">{t("Let's make a plan.")}</span>
          </h1>
          <p className="max-w-prose text-lg text-muted">
            {t("Tell us when your exam is and what you still don't know. You'll get a calm, hour-by-hour revision plan for tonight, with breaks built in and your sleep protected.")}
          </p>
          <button type="button" className="btn btn-primary text-lg" onClick={onStart}>
            {t("Start my plan")}
            <span aria-hidden="true">→</span>
          </button>
          <ul className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted">
            <li><span aria-hidden="true" className="text-good">✓ </span>{t("Takes under a minute")}</li>
            <li><span aria-hidden="true" className="text-good">✓ </span>{t("No sign-up needed")}</li>
            <li><span aria-hidden="true" className="text-good">✓ </span>{t("Works even if AI is down")}</li>
          </ul>
        </div>

        <div className="card" aria-label={t("Example plan")} role="img">
          <p className="mb-1 text-sm font-bold uppercase tracking-widest text-accent">{t("Example")}</p>
          <p className="mb-4 text-xl font-bold">{t("Your plan for tonight")}</p>
          <ol>
            {PREVIEW.map((r) => (
              <li key={r.time} className="grid grid-cols-[3.5rem_1.5rem_1fr] items-start gap-x-3 border-t border-line py-3 first:border-t-0">
                <span className="tnum pt-0.5 font-mono text-sm text-muted">{r.time}</span>
                <span className="flex justify-center pt-2"><span className="dot" style={{ background: r.color }} /></span>
                <div>
                  <p className="font-semibold">{t(r.title)} <span className="text-sm font-normal text-muted">{t(r.mins)}</span></p>
                  <p className="text-sm text-muted">{t(r.note)}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="how-title">
        <h2 id="how-title" className="mb-5 text-2xl font-bold">{t("How it works")}</h2>
        <ol className="grid gap-4 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="card">
              <span aria-hidden="true" className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface2 text-2xl">{s.icon}</span>
              <p className="mb-1 text-lg font-bold">{i + 1}. {t(s.title)}</p>
              <p className="text-muted">{t(s.text)}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
