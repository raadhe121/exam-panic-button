import type { User } from "@supabase/supabase-js";
import type { StoredPlan } from "./storage";
import { getSupabase } from "./supabase";

function sb() {
  const c = getSupabase();
  if (!c) throw new Error("Accounts are not set up on this site.");
  return c;
}

function newCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return Array.from(bytes, (b) => "abcdefghjkmnpqrstuvwxyz23456789"[b % 31]).join("");
}

export async function createShare(user: User, plan: StoredPlan, title: string): Promise<string> {
  const code = newCode();
  const { error } = await sb().from("shared_plans").insert({ code, user_id: user.id, title, plan, done: plan.done });
  if (error) throw new Error("Couldn't create the share link. Did you run the latest supabase/schema.sql?");
  return code;
}

export async function syncShare(code: string, plan: StoredPlan) {
  await sb().from("shared_plans").update({ plan, done: plan.done, updated_at: new Date().toISOString() }).eq("code", code);
}

export async function stopShare(code: string) {
  await sb().from("shared_plans").delete().eq("code", code);
}

export interface SharedPlan {
  title: string;
  plan: StoredPlan;
  done: Record<number, boolean>;
  updated_at: string;
}

export async function fetchShared(code: string): Promise<SharedPlan | null> {
  const { data, error } = await sb().rpc("get_shared_plan", { p_code: code });
  if (error) throw error;
  return (data as SharedPlan[])?.[0] ?? null;
}
