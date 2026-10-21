import { createClient } from "@supabase/supabase-js";

/** Verifies the Bearer access token from the browser and returns the user id, or null. */
export async function verifyUser(req: Request): Promise<string | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!url || !anon || !token) return null;
  const { data, error } = await createClient(url, anon).auth.getUser(token);
  return error ? null : (data.user?.id ?? null);
}

/** Service-role client for the reminder cron. Never import this in client code. */
export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
}
