import type { User } from "@supabase/supabase-js";
import type { AppState, StoredPlan, TimingInputs } from "./storage";
import { getSupabase } from "./supabase";
import type { Topic } from "./types";

export interface ExamRow {
  id: string;
  name: string;
  timing: TimingInputs;
  topics: Topic[];
  plan: StoredPlan | null;
  updated_at: string;
}

function sb() {
  const c = getSupabase();
  if (!c) throw new Error("Accounts are not set up on this site.");
  return c;
}

export async function saveExam(user: User, state: AppState, name: string): Promise<string> {
  const row = {
    user_id: user.id,
    name,
    timing: state.timing,
    topics: state.topics,
    plan: state.plan,
    updated_at: new Date().toISOString(),
  };
  if (state.examId) {
    const { error } = await sb().from("exams").update(row).eq("id", state.examId);
    if (error) throw error;
    return state.examId;
  }
  const { data, error } = await sb().from("exams").insert(row).select("id").single();
  if (error) throw error;
  return data.id as string;
}

export async function listExams(): Promise<ExamRow[]> {
  const { data, error } = await sb().from("exams").select("*").order("updated_at", { ascending: false });
  if (error) throw error;
  return data as ExamRow[];
}

export async function getExam(id: string): Promise<ExamRow | null> {
  const { data, error } = await sb().from("exams").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return data as ExamRow | null;
}

export async function deleteExam(id: string) {
  const { error } = await sb().from("exams").delete().eq("id", id);
  if (error) throw error;
}

/** Replaces the unsent reminders for an exam with one per upcoming block, 5 minutes before it starts. */
export async function scheduleReminders(user: User, examId: string, name: string, plan: StoredPlan) {
  const db = sb();
  await db.from("reminders").delete().eq("exam_id", examId).eq("sent", false);
  const now = Date.now();
  const rows = plan.blocks
    .filter((b) => b.type !== "break" && b.startMs - 5 * 60000 > now)
    .map((b) => ({
      user_id: user.id,
      exam_id: examId,
      fire_at: new Date(b.startMs - 5 * 60000).toISOString(),
      title: b.type === "sleep" ? "Time to wind down" : `Up next: ${b.topic ?? b.type}`,
      body: `${name}. ${b.start} to ${b.end}. ${b.tip}`,
    }));
  if (rows.length) {
    const { error } = await db.from("reminders").insert(rows);
    if (error) throw error;
  }
  return rows.length;
}

export async function accessToken(): Promise<string | null> {
  const { data } = await sb().auth.getSession();
  return data.session?.access_token ?? null;
}
