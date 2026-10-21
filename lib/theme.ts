import { LANGS, type Lang } from "./i18n";
export type Theme = "dark" | "light";

export function applyTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem("epb:theme", t);
  } catch {
    /* ignore */
  }
}

export function applyHtmlLang(lang: Lang) {
  document.documentElement.lang = LANGS.find((l) => l.id === lang)?.htmlLang ?? "en";
}
