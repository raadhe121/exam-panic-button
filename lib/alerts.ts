import type { StoredBlock } from "./storage";
import { loadSettings } from "./settings";

let ctx: AudioContext | null = null;

/** Browsers only allow audio after a tap. Call this from any user interaction. */
export function unlockAudio() {
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    /* no audio available */
  }
}

/** A soft two-note chime. */
export function chime() {
  if (!ctx) return;
  const t = ctx.currentTime;
  [660, 880].forEach((freq, i) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t + i * 0.22);
    gain.gain.exponentialRampToValueAtTime(0.18, t + i * 0.22 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.22 + 0.9);
    osc.connect(gain).connect(ctx!.destination);
    osc.start(t + i * 0.22);
    osc.stop(t + i * 0.22 + 1);
  });
}

export function buzz() {
  try {
    navigator.vibrate?.([120, 60, 120]);
  } catch {
    /* not supported */
  }
}

export const notificationsSupported = () => typeof window !== "undefined" && "Notification" in window;

function describe(b: StoredBlock): { title: string; body: string } {
  const mins = Math.round((b.endMs - b.startMs) / 60000);
  const topic = (b.topic ?? "").replace(/ \((?:revisit|[^)]*)\)$/, "");
  switch (b.type) {
    case "break":
      return { title: `Break time! ${mins} minutes`, body: b.tip };
    case "study":
      return { title: `Back to ${topic}`, body: `${mins} minutes. ${b.tip}` };
    case "revision":
      return { title: "Final revision", body: `${mins} minutes. Skim your notes, then stop.` };
    default:
      return { title: "Time to sleep", body: "Sleep is part of the plan. Your memory needs it." };
  }
}

async function showNotification(title: string, body: string) {
  const opts = { body, icon: "/icons/icon-192.png", tag: "epb-block" };
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) return void (await reg.showNotification(title, opts));
  } catch {
    /* fall through to the page API */
  }
  new Notification(title, opts);
}

/** Fires the sound, vibration and notification the user has switched on, for the block that just started. */
export function announceBlock(b: StoredBlock) {
  const s = loadSettings();
  if (s.sound) chime();
  if (s.vibration) buzz();
  if (s.notifications && notificationsSupported() && Notification.permission === "granted" && document.hidden) {
    const { title, body } = describe(b);
    void showNotification(title, body);
  }
}

/** Asks for permission (must come from a tap). Resolves true if notifications are allowed. */
export async function askNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  return (await Notification.requestPermission()) === "granted";
}
