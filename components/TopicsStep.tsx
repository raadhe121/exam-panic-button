"use client";

import { useRef, useState } from "react";
import { MAX_TOPICS, RATING_LABEL, type Rating, type Topic } from "@/lib/types";
import Stepper from "./Stepper";

const RATINGS: Rating[] = ["know", "shaky", "noidea"];
const MARK: Record<Rating, string> = { know: "✓", shaky: "~", noidea: "?" };
const COLOR: Record<Rating, string> = { know: "text-good", shaky: "text-warn", noidea: "text-bad" };

export default function TopicsStep({
  topics,
  onChange,
  onBack,
  onNext,
}: {
  topics: Topic[];
  onChange: (t: Topic[]) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [error, setError] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  const add = () => {
    const n = name.trim();
    if (!n) return setError("Type a topic name first.");
    if (topics.length >= MAX_TOPICS) return setError(`You can add up to ${MAX_TOPICS} topics. Pick the ones that matter most.`);
    if (topics.some((t) => t.name.toLowerCase() === n.toLowerCase())) return setError("You already added that topic.");
    onChange([...topics, { id: crypto.randomUUID(), name: n, subject: subject.trim(), rating: "shaky", starred: false }]);
    setName("");
    setError("");
    nameRef.current?.focus();
  };

  const set = (id: string, p: Partial<Topic>) => onChange(topics.map((t) => (t.id === id ? { ...t, ...p } : t)));

  return (
    <section>
      <Stepper step={2} />
      <h1 className="mb-1 text-3xl font-bold">What do you need to cover?</h1>
      <p className="mb-6 text-muted">Add each topic and be honest about how well you know it. Up to {MAX_TOPICS}.</p>

      <form
        className="card mb-6 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
          <div className="flex flex-col gap-1">
            <label htmlFor="topic" className="font-semibold">Topic</label>
            <input
              id="topic"
              ref={nameRef}
              className="input"
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
              aria-describedby="topic-err"
              aria-invalid={error ? true : undefined}
              placeholder="e.g. Newton's laws"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="subject" className="font-semibold">Subject <span className="font-normal text-muted">(optional)</span></label>
            <input id="subject" className="input" value={subject} maxLength={40} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Physics" />
          </div>
        </div>
        <p id="topic-err" role="alert" className="text-danger empty:hidden">{error}</p>
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted">{topics.length} of {MAX_TOPICS} added</span>
          <button type="submit" className="btn btn-primary">Add</button>
        </div>
      </form>

      {topics.length === 0 ? (
        <div className="card text-center">
          <p className="text-xl font-semibold">Add your first topic</p>
          <p className="text-muted">Start with the one that worries you most. There&apos;s no wrong order.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {topics.map((t) => (
            <li key={t.id} className="card flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold break-words">{t.name}</p>
                  {t.subject && <p className="text-sm text-muted">{t.subject}</p>}
                </div>
                <button type="button" className="btn" onClick={() => onChange(topics.filter((x) => x.id !== t.id))} aria-label={`Remove ${t.name}`}>
                  Remove
                </button>
              </div>
              <fieldset className="flex flex-wrap gap-2">
                <legend className="sr-only">How well do you know {t.name}?</legend>
                {RATINGS.map((r) => (
                  <label key={r} className="seg">
                    <input
                      type="radio"
                      className="sr-only"
                      name={`rating-${t.id}`}
                      checked={t.rating === r}
                      onChange={() => set(t.id, { rating: r })}
                    />
                    <span className={COLOR[r]} aria-hidden="true">{MARK[r]}&nbsp;</span>
                    {RATING_LABEL[r]}
                  </label>
                ))}
              </fieldset>
              <label className="seg self-start">
                <input type="checkbox" className="sr-only" checked={t.starred} onChange={(e) => set(t.id, { starred: e.target.checked })} />
                <span aria-hidden="true">{t.starred ? "★" : "☆"}&nbsp;</span>
                Important for exam
              </label>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-6 flex justify-between gap-3">
        <button type="button" className="btn" onClick={onBack}>Back</button>
        <button type="button" className="btn btn-primary" disabled={topics.length === 0} onClick={onNext}>
          Next: generate
        </button>
      </div>
      {topics.length === 0 && <p className="mt-2 text-right text-sm text-muted">Add at least one topic to continue.</p>}
    </section>
  );
}
