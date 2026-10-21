"use client";

import { useEffect } from "react";
import { applyHtmlLang } from "@/lib/theme";
import { useSettings } from "@/lib/settings";

/** Keeps <html lang> in step with the chosen language (for screen readers and hyphenation). */
export default function LangSync() {
  const { lang } = useSettings();
  useEffect(() => applyHtmlLang(lang), [lang]);
  return null;
}
