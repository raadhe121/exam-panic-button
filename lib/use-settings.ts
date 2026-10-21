"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_SETTINGS, SETTINGS_EVENT, loadSettings, type Settings } from "./settings";

function subscribe(cb: () => void) {
  window.addEventListener(SETTINGS_EVENT, cb);
  return () => window.removeEventListener(SETTINGS_EVENT, cb);
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, loadSettings, () => DEFAULT_SETTINGS);
}
