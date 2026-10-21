"use client";

import { useEffect, useState } from "react";
import type { ExamRow } from "@/lib/exams";
import { useT } from "@/lib/i18n";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";

interface Note {
  id: string;
  topic: string;
  body: string;
}

export default function NotesTab({ exam, onCount }: { exam: ExamRow; onCount?: (n: number) => void }) {
  const { user } = useAuth();
  const t = useT();
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [topic, setTopic] = useState(exam.topics[0]?.name ?? "");
  const [body, setBody] = useState("");
  const [err, setErr] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const sb = getSupabase()!;

  useEffect(() => {
    sb.from("notes").select("id,topic,body").eq("exam_id", exam.id).order("updated_at", { ascending: false }).then(({ data, error }) => {
      if (error) setErr(t("Couldn't load notes."));
      else setNotes(data as Note[]);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per exam; `t` is only for the error text
  }, [sb, exam.id]);

  useEffect(() => {
    if (notes) onCount?.(notes.length);
  }, [notes, onCount]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return setErr(t("Write something in the note first."));
    const { data, error } = await sb
      .from("notes")
      .insert({ user_id: user!.id, exam_id: exam.id, topic, body: body.trim() })
      .select("id,topic,body")
      .single();
    if (error) return setErr(t("Couldn't save that note."));
    setNotes((n) => [data as Note, ...(n ?? [])]);
    setBody("");
    setErr("");
  };

  const saveEdit = async (id: string) => {
    if (!draft.trim()) return setErr(t("A note can't be empty. Delete it instead."));
    const { error } = await sb.from("notes").update({ body: draft.trim(), updated_at: new Date().toISOString() }).eq("id", id);
    if (error) return setErr(t("Couldn't save your changes."));
    setNotes((n) => n?.map((x) => (x.id === id ? { ...x, body: draft.trim() } : x)) ?? null);
    setEditing(null);
    setErr("");
  };

  const remove = async (id: string) => {
    const { error } = await sb.from("notes").delete().eq("id", id);
    if (error) return setErr(t("Couldn't delete that note."));
    setNotes((n) => n?.filter((x) => x.id !== id) ?? null);
  };

  const icon = "flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:text-ink";

  return (
    <div className="flex flex-col gap-8">
      <form className="card flex flex-col gap-4" onSubmit={add}>
        <label htmlFor="note-body" className="text-lg font-bold">{t("New note")}</label>
        <textarea
          id="note-body"
          className="input min-h-36"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={4000}
          placeholder={t("A formula, a definition, something you keep forgetting…")}
        />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <label htmlFor="note-topic" className="text-muted">{t("Topic")}</label>
            <select id="note-topic" className="input !w-auto" value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option value="">{t("General")}</option>
              {exam.topics.map((tp) => <option key={tp.id} value={tp.name}>{tp.name}</option>)}
            </select>
          </div>
          <button type="submit" className="btn btn-primary">{t("Add note")}</button>
        </div>
        <p role="alert" className="text-danger empty:hidden">{err}</p>
      </form>

      <div>
        <h2 className="mb-3 text-xl font-bold">{t("Your notes")}</h2>
        {notes === null ? <p className="text-muted" role="status">{t("Loading...")}</p> : notes.length === 0 ? (
          <div className="card py-10 text-center">
            <p aria-hidden="true" className="mb-2 text-4xl">📝</p>
            <p className="text-xl font-semibold">{t("No notes yet")}</p>
            <p className="text-muted">{t("Jot down formulas, tricky definitions or anything you keep forgetting.")}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {notes.map((n) => (
              <li key={n.id} className="card flex items-start justify-between gap-3 !py-4">
                <div className="min-w-0 flex-1">
                  <p className="mb-1 text-sm font-bold text-accent">{n.topic || t("General")}</p>
                  {editing === n.id ? (
                    <div className="flex flex-col gap-2">
                      <label htmlFor={`edit-${n.id}`} className="sr-only">{t("Edit note")}</label>
                      <textarea id={`edit-${n.id}`} className="input min-h-24" value={draft} maxLength={4000} onChange={(e) => setDraft(e.target.value)} autoFocus />
                      <div className="flex gap-2">
                        <button type="button" className="btn btn-primary" onClick={() => saveEdit(n.id)}>{t("Save")}</button>
                        <button type="button" className="btn" onClick={() => setEditing(null)}>{t("Cancel")}</button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-lg whitespace-pre-wrap break-words">{n.body}</p>
                  )}
                </div>
                {editing !== n.id && (
                  <div className="flex shrink-0">
                    <button type="button" className={icon} aria-label={t("Edit note: {text}", { text: n.body.slice(0, 30) })} onClick={() => { setEditing(n.id); setDraft(n.body); }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z" /></svg>
                    </button>
                    <button type="button" className={icon} aria-label={t("Delete note: {text}", { text: n.body.slice(0, 30) })} onClick={() => remove(n.id)}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M6 6l1 14h10l1-14" /></svg>
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-muted">{t("Tip: turn your notes into flashcards in one tap from the Flashcards tab.")}</p>
      </div>
    </div>
  );
}
