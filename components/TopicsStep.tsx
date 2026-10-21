"use client";

import { useRef, useState } from "react";
import { MAX_TOPICS, RATING_LABEL, type Rating, type Topic } from "@/lib/types";
import Stepper from "./Stepper";

const RATINGS: Rating[] = ["noidea", "shaky", "know"];
const MARK: Record<Rating, string> = { know: "✓", shaky: "~", noidea: "?" };
const COLOR: Record<Rating, string> = { know: "text-good", shaky: "text-warn", noidea: "text-bad" };
/** Friendlier wording for the quick-add chips; the plan itself still uses Know it / Shaky / No idea. */
const FRIENDLY: Record<Rating, string> = { noidea: "Not at all", shaky: "A bit", know: "Pretty well" };

/** Scales a photo down to a JPEG that fits comfortably in one request (phone photos can be 10 MB+). */
async function shrinkImage(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bmp.width * scale);
  canvas.height = Math.round(bmp.height * scale);
  canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.8);
}

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
  const [rating, setRating] = useState<Rating>("noidea");
  const [error, setError] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);
  const [showSyllabus, setShowSyllabus] = useState(false);
  const [syllabus, setSyllabus] = useState("");
  const [parsing, setParsing] = useState(false);
  const [syllabusMsg, setSyllabusMsg] = useState("");
  const [scanning, setScanning] = useState(false);

  /** Adds topics from a syllabus or photo. Topics the AI thinks matter most come in starred. */
  const addImported = (list: { name: string; subject?: string; important?: boolean }[]) => {
    const have = new Set(topics.map((t) => t.name.toLowerCase()));
    const fresh = list.filter((t) => !have.has(t.name.toLowerCase()));
    const room = MAX_TOPICS - topics.length;
    const added = fresh.slice(0, room);
    onChange([
      ...topics,
      ...added.map((t) => ({ id: crypto.randomUUID(), name: t.name, subject: t.subject ?? "", rating: "shaky" as Rating, starred: !!t.important })),
    ]);
    const starred = added.filter((t) => t.important).length;
    setSyllabusMsg(
      `Added ${added.length} topic${added.length === 1 ? "" : "s"}.` +
        (starred ? ` We starred ${starred} that usually matter most.` : "") +
        " Now rate each one below." +
        (fresh.length > room ? ` We stopped at ${MAX_TOPICS}.` : ""),
    );
  };

  const importSyllabus = async () => {
    setParsing(true);
    setSyllabusMsg("");
    try {
      const res = await fetch("/api/topics", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: syllabus }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      addImported(j.topics);
      setSyllabus("");
    } catch (e) {
      setSyllabusMsg(e instanceof Error && e.message ? e.message : "Couldn't read that. Please try again or add topics by hand.");
    }
    setParsing(false);
  };

  const importPhoto = async (file: File | undefined) => {
    if (!file) return;
    setScanning(true);
    setSyllabusMsg("");
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ image: await shrinkImage(file) }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      addImported(j.topics);
    } catch (e) {
      setSyllabusMsg(e instanceof Error && e.message ? e.message : "Couldn't read that photo. Try a clearer one or type the topics.");
    }
    setScanning(false);
  };

  const add = () => {
    const n = name.trim();
    if (!n) return setError("Type a topic name first.");
    if (topics.length >= MAX_TOPICS) return setError(`You can add up to ${MAX_TOPICS} topics. Pick the ones that matter most.`);
    if (topics.some((t) => t.name.toLowerCase() === n.toLowerCase())) return setError("You already added that topic.");
    onChange([...topics, { id: crypto.randomUUID(), name: n, subject: subject.trim(), rating, starred: false }]);
    setName("");
    setError("");
    nameRef.current?.focus();
  };

  const set = (id: string, p: Partial<Topic>) => onChange(topics.map((t) => (t.id === id ? { ...t, ...p } : t)));

  return (
    <section>
      <Stepper step={2} />
      <h1 className="page-title mb-2">What do you need to cover?</h1>
      <p className="mb-8 text-lg text-muted">Start with the one that worries you most. Up to {MAX_TOPICS}.</p>

      <form
        className="card mb-8 flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-[1.6fr_1fr]">
          <div className="flex flex-col gap-2">
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
          <div className="flex flex-col gap-2">
            <label htmlFor="subject" className="font-semibold">Subject <span className="font-normal text-muted">(optional)</span></label>
            <input id="subject" className="input" value={subject} maxLength={40} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Physics" />
          </div>
        </div>

        <fieldset>
          <legend className="mb-2 font-semibold">How well do you know it?</legend>
          <div className="grid grid-cols-3 gap-2">
            {RATINGS.map((r) => (
              <label key={r} className={`seg seg-${r} flex-col justify-center text-center`}>
                <input type="radio" className="sr-only" name="new-rating" checked={rating === r} onChange={() => setRating(r)} />
                <span>{FRIENDLY[r]}</span>
                <span className="text-xs font-normal text-muted">{RATING_LABEL[r]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <p id="topic-err" role="alert" className="text-danger empty:hidden">{error}</p>
        <button
          type="submit"
          className="btn w-full border-nowline bg-now font-bold text-accent"
          disabled={topics.length >= MAX_TOPICS}
        >
          + Add topic
        </button>
      </form>

      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Your topics</h2>
        <div className="flex items-center gap-4 text-sm">
          <button type="button" className="min-h-11 font-semibold text-accent underline" onClick={() => setShowSyllabus((v) => !v)} aria-expanded={showSyllabus}>
            Paste syllabus
          </button>
          <label className={`inline-flex min-h-11 cursor-pointer items-center font-semibold text-accent underline ${scanning ? "opacity-60" : ""}`}>
            {scanning ? "Reading photo..." : "Snap a photo"}
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              disabled={scanning}
              onChange={(e) => {
                importPhoto(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
          </label>
          <span className="text-muted">{topics.length} of {MAX_TOPICS}</span>
        </div>
      </div>

      {showSyllabus && (
        <div className="card mb-4 flex flex-col gap-3">
          <label htmlFor="syllabus" className="text-muted">Paste a syllabus or chapter list and we&apos;ll turn it into topics.</label>
          <textarea id="syllabus" className="input min-h-32" value={syllabus} maxLength={6000} onChange={(e) => setSyllabus(e.target.value)} />
          <div className="flex justify-end">
            <button type="button" className="btn" disabled={parsing || syllabus.trim().length < 3} onClick={importSyllabus}>
              {parsing ? "Reading..." : "Turn into topics"}
            </button>
          </div>
        </div>
      )}
      <p role="status" className="mb-3 text-muted empty:hidden">{syllabusMsg}</p>

      {topics.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line px-5 py-10 text-center text-muted">
          <p className="mb-1 text-lg font-semibold text-ink">Add your first topic</p>
          Nothing yet. Add one above, snap a photo of your notes, or{" "}
          <button type="button" className="font-semibold text-accent underline" onClick={() => setShowSyllabus(true)}>paste your syllabus</button>.
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
                  <label key={r} className={`seg seg-${r}`}>
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

      <div className="mt-8 flex items-start justify-between gap-3">
        <button type="button" className="btn" onClick={onBack}>Back</button>
        <div className="flex flex-col items-end gap-1">
          <button type="button" className="btn btn-primary" disabled={topics.length === 0} onClick={onNext}>
            Next: review
          </button>
          {topics.length === 0 && <p className="text-sm text-muted">Add at least one topic</p>}
        </div>
      </div>
    </section>
  );
}
