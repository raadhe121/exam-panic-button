"use client";

import { useEffect, useState } from "react";
import { accessToken, type ExamRow } from "@/lib/exams";
import { useLang, useT } from "@/lib/i18n";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";

interface Card {
  id: string;
  topic: string;
  front: string;
  back: string;
  known: boolean;
}

export default function FlashcardsTab({ exam, onCount }: { exam: ExamRow; onCount?: (n: number) => void }) {
  const { user } = useAuth();
  const t = useT();
  const lang = useLang();
  const sb = getSupabase()!;
  const [cards, setCards] = useState<Card[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    sb.from("flashcards").select("id,topic,front,back,known").eq("exam_id", exam.id).order("created_at").then(({ data, error }) => {
      if (error) setErr(t("Couldn't load flashcards."));
      else setCards(data as Card[]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per exam; `t` is only for the error text
  }, [sb, exam.id]);

  useEffect(() => {
    if (cards) onCount?.(cards.length);
  }, [cards, onCount]);

  const fromNotes = async () => {
    setBusy(true);
    setErr("");
    const { data: notes, error: e1 } = await sb.from("notes").select("topic,body").eq("exam_id", exam.id);
    if (e1) {
      setBusy(false);
      return setErr(t("Couldn't read your notes."));
    }
    const have = new Set((cards ?? []).map((c) => c.back));
    const rows = (notes ?? [])
      .filter((n) => !have.has(n.body))
      .map((n) => ({
        user_id: user!.id,
        exam_id: exam.id,
        topic: n.topic,
        front: n.topic ? t("{topic}: what should you remember?", { topic: n.topic }) : t("What should you remember?"),
        back: n.body,
      }));
    if (!rows.length) {
      setBusy(false);
      return setErr(notes?.length ? t("All your notes are already flashcards.") : t("Add a note first, then turn it into a flashcard."));
    }
    const { data, error } = await sb.from("flashcards").insert(rows).select("id,topic,front,back,known");
    if (error) setErr(t("Couldn't make flashcards from your notes."));
    else setCards((c) => [...(c ?? []), ...(data as Card[])]);
    setBusy(false);
  };

  const generate = async () => {
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/flashcards", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${await accessToken()}` },
        body: JSON.stringify({ topics: exam.topics.map((tp) => ({ name: tp.name, subject: tp.subject })), lang }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      const rows = (j.cards as { topic: string; front: string; back: string }[]).map((c) => ({ ...c, user_id: user!.id, exam_id: exam.id }));
      const { data, error } = await sb.from("flashcards").insert(rows).select("id,topic,front,back,known");
      if (error) throw error;
      setCards((c) => [...(c ?? []), ...(data as Card[])]);
    } catch (e) {
      setErr(t(e instanceof Error && e.message ? e.message : "Couldn't make flashcards right now."));
    }
    setBusy(false);
  };

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return setErr(t("Fill in both sides of the card."));
    const { data, error } = await sb
      .from("flashcards")
      .insert({ user_id: user!.id, exam_id: exam.id, topic: "", front: front.trim(), back: back.trim() })
      .select("id,topic,front,back,known")
      .single();
    if (error) return setErr(t("Couldn't save that card."));
    setCards((c) => [...(c ?? []), data as Card]);
    setFront("");
    setBack("");
    setErr("");
  };

  const mark = async (known: boolean) => {
    const card = cards![idx];
    await sb.from("flashcards").update({ known }).eq("id", card.id);
    setCards((cs) => cs!.map((c) => (c.id === card.id ? { ...c, known } : c)));
    setFlipped(false);
    setIdx((i) => (i + 1) % cards!.length);
  };

  const remove = async () => {
    const card = cards![idx];
    const { error } = await sb.from("flashcards").delete().eq("id", card.id);
    if (error) return setErr(t("Couldn't delete that card."));
    setCards((cs) => cs!.filter((c) => c.id !== card.id));
    setIdx(0);
    setFlipped(false);
  };

  const card = cards?.[idx];
  const knownCount = cards?.filter((c) => c.known).length ?? 0;

  return (
    <div className="flex flex-col gap-4">
      {cards === null ? <p className="text-muted" role="status">{t("Loading...")}</p> : cards.length === 0 ? (
        <div className="card py-10 text-center">
          <p aria-hidden="true" className="mb-2 text-4xl">🗂️</p>
          <p className="text-xl font-semibold">{t("No flashcards yet")}</p>
          <p className="mb-3 text-muted">{t("Let AI make a few per topic, or add your own below.")}</p>
          <button type="button" className="btn btn-primary" onClick={generate} disabled={busy}>
            {busy ? t("Making flashcards...") : t("Make flashcards with AI")}
          </button>
        </div>
      ) : card && (
        <div className="card flex flex-col gap-3">
          <div className="flex justify-between text-sm text-muted">
            <span>{t("Card {a} of {b}", { a: idx + 1, b: cards.length })}{card.topic ? ` · ${card.topic}` : ""}</span>
            <span>{t("{n} known", { n: knownCount })}</span>
          </div>
          <button
            type="button"
            className="min-h-48 rounded-2xl border border-line bg-gradient-to-br from-surface2 to-surface p-6 text-left text-xl shadow-lg"
            aria-label={flipped ? t("Showing answer. Press to show question.") : t("Showing question. Press to show answer.")}
            onClick={() => setFlipped(!flipped)}
          >
            <span className="mb-1 block text-sm font-semibold text-muted">{flipped ? t("Answer") : t("Question")}</span>
            {flipped ? card.back : card.front}
          </button>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn" onClick={() => mark(false)}>{t("Still learning")}</button>
            <button type="button" className="btn btn-primary" onClick={() => mark(true)}>{t("I know it")}</button>
            <button type="button" className="btn" onClick={() => { setFlipped(false); setIdx((idx + 1) % cards.length); }}>{t("Skip")}</button>
            <button type="button" className="btn" onClick={remove}>{t("Delete card")}</button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {cards && cards.length > 0 && (
          <button type="button" className="btn" onClick={generate} disabled={busy}>
            {busy ? t("Making flashcards...") : t("Add more with AI")}
          </button>
        )}
        <button type="button" className="btn" onClick={fromNotes} disabled={busy}>{t("Turn my notes into flashcards")}</button>
      </div>

      <form className="card flex flex-col gap-3" onSubmit={add}>
        <h2 className="text-lg font-bold">{t("Add your own card")}</h2>
        <div className="flex flex-col gap-1">
          <label htmlFor="fc-front" className="font-semibold">{t("Front")}</label>
          <input id="fc-front" className="input" value={front} maxLength={300} onChange={(e) => setFront(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="fc-back" className="font-semibold">{t("Back")}</label>
          <input id="fc-back" className="input" value={back} maxLength={500} onChange={(e) => setBack(e.target.value)} />
        </div>
        <div className="flex justify-end"><button type="submit" className="btn">{t("Add card")}</button></div>
      </form>
      <p role="alert" className="text-danger empty:hidden">{err}</p>
    </div>
  );
}
