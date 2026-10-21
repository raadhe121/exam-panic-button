"use client";

import { useEffect, useState } from "react";
import type { ExamRow } from "@/lib/exams";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";

interface Note {
  id: string;
  topic: string;
  body: string;
}

export default function NotesTab({ exam }: { exam: ExamRow }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [topic, setTopic] = useState("");
  const [body, setBody] = useState("");
  const [err, setErr] = useState("");
  const sb = getSupabase()!;

  useEffect(() => {
    sb.from("notes").select("id,topic,body").eq("exam_id", exam.id).order("updated_at", { ascending: false }).then(({ data, error }) => {
      if (error) setErr("Couldn't load notes.");
      else setNotes(data as Note[]);
    });
  }, [sb, exam.id]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return setErr("Write something in the note first.");
    const { data, error } = await sb
      .from("notes")
      .insert({ user_id: user!.id, exam_id: exam.id, topic, body: body.trim() })
      .select("id,topic,body")
      .single();
    if (error) return setErr("Couldn't save that note.");
    setNotes((n) => [data as Note, ...(n ?? [])]);
    setBody("");
    setErr("");
  };

  const remove = async (id: string) => {
    const { error } = await sb.from("notes").delete().eq("id", id);
    if (error) return setErr("Couldn't delete that note.");
    setNotes((n) => n?.filter((x) => x.id !== id) ?? null);
  };

  return (
    <div className="flex flex-col gap-4">
      <form className="card flex flex-col gap-3" onSubmit={add}>
        <div className="flex flex-col gap-1">
          <label htmlFor="note-topic" className="font-semibold">Topic</label>
          <select id="note-topic" className="input" value={topic} onChange={(e) => setTopic(e.target.value)}>
            <option value="">General</option>
            {exam.topics.map((t) => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="note-body" className="font-semibold">Note</label>
          <textarea id="note-body" className="input min-h-28" value={body} onChange={(e) => setBody(e.target.value)} maxLength={4000} />
        </div>
        <p role="alert" className="text-danger empty:hidden">{err}</p>
        <div className="flex justify-end"><button type="submit" className="btn btn-primary">Add note</button></div>
      </form>

      {notes === null ? <p className="text-muted" role="status">Loading...</p> : notes.length === 0 ? (
        <div className="card py-10 text-center">
          <p aria-hidden="true" className="mb-2 text-4xl">📝</p>
          <p className="text-xl font-semibold">No notes yet</p>
          <p className="text-muted">Jot down formulas, tricky definitions or anything you keep forgetting.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {notes.map((n) => (
            <li key={n.id} className="card">
              <p className="text-sm font-semibold text-muted">{n.topic || "General"}</p>
              <p className="whitespace-pre-wrap break-words">{n.body}</p>
              <button type="button" className="btn mt-3" onClick={() => remove(n.id)} aria-label={`Delete note: ${n.body.slice(0, 30)}`}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
