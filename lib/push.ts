import type { User } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";

export const pushSupported = () =>
  typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

function keyToBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Asks permission, subscribes this browser to web push and stores the subscription for the user. */
export async function enablePush(user: User): Promise<void> {
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!vapid) throw new Error("Reminders are not set up on this site.");
  if (!pushSupported()) throw new Error("This browser doesn't support notifications.");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Notifications are blocked. Allow them in your browser settings to get reminders.");
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyToBytes(vapid) }));
  const json = sub.toJSON();
  const { error } = await getSupabase()!
    .from("push_subscriptions")
    .upsert({ user_id: user.id, endpoint: sub.endpoint, subscription: json }, { onConflict: "endpoint" });
  if (error) throw error;
}
