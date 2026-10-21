"use client";

import { useT } from "@/lib/i18n-client";
import { LANGS, parseLang } from "@/lib/i18n";
import { saveSettings, useSettings } from "@/lib/settings";

/** Compact language switch for the header: English, Hindi, Hinglish. */
export default function LanguagePicker() {
  const { lang } = useSettings();
  const t = useT();
  return (
    <label className="flex items-center">
      <span className="sr-only">{t("Language")}</span>
      <select
        className="input !min-h-11 !w-auto !px-3 !py-2 text-sm font-semibold"
        value={lang}
        onChange={(e) => saveSettings({ lang: parseLang(e.target.value) })}
      >
        {LANGS.map((l) => (
          <option key={l.id} value={l.id}>{l.label}</option>
        ))}
      </select>
    </label>
  );
}
