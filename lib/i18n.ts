import { useCallback } from "react";
import { hi } from "./i18n/hi";
import { hinglish } from "./i18n/hinglish";
import { useSettings } from "./settings";

export type Lang = "en" | "hi" | "hinglish";

export const LANGS: { id: Lang; label: string; htmlLang: string }[] = [
  { id: "en", label: "English", htmlLang: "en" },
  { id: "hi", label: "हिन्दी", htmlLang: "hi" },
  { id: "hinglish", label: "Hinglish", htmlLang: "en-IN" },
];

export const DEFAULT_LANG: Lang = "en";

export function parseLang(v: unknown): Lang {
  return v === "hi" || v === "hinglish" ? v : "en";
}

const DICT: Record<Lang, Record<string, string>> = { en: {}, hi, hinglish };

export type Vars = Record<string, string | number>;
export type TFn = (text: string, vars?: Vars) => string;

/**
 * English text is the key. Anything without a translation falls back to the English text,
 * so a missing entry never breaks a screen. `{name}` placeholders are filled from `vars`.
 */
export function translate(lang: Lang, text: string, vars?: Vars): string {
  const out = DICT[lang][text] ?? text;
  return vars ? out.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : out;
}

/** React hook: the chosen language id (for date formats and the like). */
export function useLang(): Lang {
  return useSettings().lang;
}

/** React hook: a `t` function for the language chosen in Settings. */
export function useT(): TFn {
  const { lang } = useSettings();
  return useCallback((text, vars) => translate(lang, text, vars), [lang]);
}

/** Locale for dates and weekday names. Hinglish keeps English day names. */
export function dateLocale(lang: Lang) {
  return lang === "hi" ? "hi-IN" : "en-GB";
}

/**
 * Extra instruction for AI prompts so generated text comes back in the student's language.
 * Names, JSON keys and fixed labels stay as given so validation and matching keep working.
 */
export function aiLanguageNote(lang: Lang): string {
  if (lang === "hi") {
    return "\nLANGUAGE: write every human-readable sentence (tips, messages, reasons, questions, answers, explanations) in simple Hindi in Devanagari script. Keep JSON keys, topic names and any fixed labels exactly as given.";
  }
  if (lang === "hinglish") {
    return "\nLANGUAGE: write every human-readable sentence (tips, messages, reasons, questions, answers, explanations) in Hinglish: casual Hindi written in Roman letters mixed with common English words, the way students text each other (for example \"Pehle basics samajh lo, phir 5 line ka summary likho\"). Do not use Devanagari. Keep JSON keys, topic names and any fixed labels exactly as given.";
  }
  return "";
}
