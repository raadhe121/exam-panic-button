import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null | undefined;

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
// Supabase calls this the "publishable" key now; the older name is "anon".
const KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(URL && KEY);

/** Browser client. Null when Supabase env vars are missing (the app then runs in guest mode). */
export function getSupabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  client = supabaseConfigured
    ? createClient(URL!, KEY!)
    : null;
  return client;
}
