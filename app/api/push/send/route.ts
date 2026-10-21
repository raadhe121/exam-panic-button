import webpush from "web-push";
import { adminClient } from "@/lib/serverAuth";

export const maxDuration = 30;

/** Called by Vercel Cron (see vercel.json). Sends due reminders as web push notifications. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const db = adminClient();
  if (!pub || !priv || !db) return Response.json({ error: "Push is not configured." }, { status: 503 });
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@example.com", pub, priv);

  const { data: due } = await db
    .from("reminders")
    .select("id,user_id,title,body")
    .eq("sent", false)
    .lte("fire_at", new Date().toISOString())
    .limit(200);

  let sent = 0;
  for (const r of due ?? []) {
    const { data: subs } = await db.from("push_subscriptions").select("id,subscription").eq("user_id", r.user_id);
    for (const s of subs ?? []) {
      try {
        await webpush.sendNotification(s.subscription, JSON.stringify({ title: r.title, body: r.body }));
        sent++;
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("id", s.id);
      }
    }
    await db.from("reminders").update({ sent: true }).eq("id", r.id);
  }
  return Response.json({ checked: due?.length ?? 0, sent });
}
