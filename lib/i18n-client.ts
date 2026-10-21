"use client";

import { useCallback } from "react";
import { translate, type Lang, type TFn } from "./i18n";
import { useSettings } from "./settings";

/** React hook: the chosen language id (for date formats and the like). */
export function useLang(): Lang {
  return useSettings().lang;
}

/** React hook: a `t` function for the language chosen in Settings. */
export function useT(): TFn {
  const { lang } = useSettings();
  return useCallback((text, vars) => translate(lang, text, vars), [lang]);
}
