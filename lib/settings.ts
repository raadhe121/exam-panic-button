import { useSyncExternalStore } from "react";
import type { Lang } from "./i18n";

export interface Settings {
  /** Default hours of sleep before the exam. */
  sleepHours: number;
  notifications: boolean;
  sound: boolean;
  vibration: boolean;
  lang: Lang;
}

export const DEFAULT_SETTINGS: Settings = { sleepHours: 7, notifications: false, sound: true, vibration: true, lang: "en" };

const KEY = "epb:settings";
const EVENT = "epb:settings-changed";
let cache: Settings = DEFAULT_SETTINGS;
let loaded = false;

export function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  if (loaded) return cache;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) cache = { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
  } catch {
    /* use defaults */
  }
  return cache;
}

export function saveSettings(patch: Partial<Settings>) {
  cache = { ...loadSettings(), ...patch };
  try {
    localStorage.setItem(KEY, JSON.stringify(cache));
  } catch {
    /* storage unavailable: settings last for this visit only */
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  return () => window.removeEventListener(EVENT, cb);
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, loadSettings, () => DEFAULT_SETTINGS);
}
