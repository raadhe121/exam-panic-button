"use client";

import { useEffect, useState } from "react";
import { useT } from "@/lib/i18n-client";
import { LANGS, parseLang } from "@/lib/i18n";
import { askNotificationPermission, chime, notificationsSupported, unlockAudio } from "@/lib/alerts";
import { isIos, isStandalone, promptInstall, useCanInstall } from "@/lib/pwa";
import { saveSettings, useSettings } from "@/lib/settings";
import { applyTheme } from "@/lib/theme";

function Switch({ id, label, hint, checked, onChange }: { id: string; label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  const t = useT();
  return (
    <div className="flex items-center justify-between gap-4 border-t border-line py-4 first:border-t-0">
      <div className="min-w-0">
        <label htmlFor={id} className="font-semibold">{label}</label>
        {hint && <p id={`${id}-hint`} className="text-sm text-muted">{hint}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 shrink-0 rounded-full border-2 transition-colors ${checked ? "border-transparent bg-accent" : "border-line bg-surface2"}`}
      >
        <span className={`absolute top-0.5 h-6 w-6 rounded-full transition-all ${checked ? "left-[1.7rem] bg-accent-ink" : "left-0.5 bg-muted"}`} style={checked ? { background: "var(--accent-ink)" } : undefined} />
        <span className="sr-only">{checked ? t("On") : t("Off")}</span>
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const settings = useSettings();
  const t = useT();
  const canInstall = useCanInstall();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [msg, setMsg] = useState("");
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- read browser state after mount */
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
    setInstalled(isStandalone());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  const chooseTheme = (mode: "dark" | "light") => {
    applyTheme(mode);
    setTheme(mode);
  };

  const toggleNotifications = async (on: boolean) => {
    setMsg("");
    if (!on) return saveSettings({ notifications: false });
    if (!notificationsSupported()) return setMsg(t("This browser doesn't support notifications."));
    if (await askNotificationPermission()) {
      saveSettings({ notifications: true });
      setMsg(t("Notifications are on. We'll ping you when a block starts while the app is in the background."));
    } else {
      setMsg(t("Notifications are blocked. Allow them in your browser's site settings, then try again."));
    }
  };

  return (
    <section className="mx-auto w-full max-w-2xl">
      <h1 className="page-title mb-2">{t("Settings")}</h1>
      <p className="mb-8 text-lg text-muted">{t("Saved on this device.")}</p>

      <div className="card mb-6">
        <div className="pb-4">
          <p className="mb-2 font-semibold" id="lang-label">{t("Language")}</p>
          <div role="radiogroup" aria-labelledby="lang-label" className="grid grid-cols-3 gap-2">
            {LANGS.map((l) => (
              <label key={l.id} className="seg justify-center">
                <input type="radio" className="sr-only" name="lang" checked={settings.lang === l.id} onChange={() => saveSettings({ lang: parseLang(l.id) })} />
                {l.label}
              </label>
            ))}
          </div>
          <p className="mt-2 text-sm text-muted">{t("Also used for AI tips, explanations, quizzes and flashcards you generate next.")}</p>
        </div>
        <div className="border-t border-line py-4">
          <p className="mb-2 font-semibold" id="theme-label">{t("Theme")}</p>
          <div role="radiogroup" aria-labelledby="theme-label" className="grid grid-cols-2 gap-2">
            {(["dark", "light"] as const).map((mode) => (
              <label key={mode} className="seg justify-center">
                <input type="radio" className="sr-only" name="theme" checked={theme === mode} onChange={() => chooseTheme(mode)} />
                {mode === "dark" ? t("Dark (night)") : t("Light")}
              </label>
            ))}
          </div>
        </div>
        <div className="border-t border-line py-4">
          <label htmlFor="sleep-hours" className="font-semibold">{t("Default sleep")}</label>
          <p className="mb-2 text-sm text-muted">{t("Used to suggest your bedtime before the exam.")}</p>
          <select
            id="sleep-hours"
            className="input !w-auto"
            value={settings.sleepHours}
            onChange={(e) => saveSettings({ sleepHours: Number(e.target.value) })}
          >
            {[5, 6, 7, 8, 9, 10].map((h) => (
              <option key={h} value={h}>{t("{h} hours before the exam", { h })}{h === 7 ? ` ${t("(recommended)")}` : ""}</option>
            ))}
          </select>
        </div>
        <Switch id="sound" label={t("Sound")} hint={t("A soft chime when a block ends.")} checked={settings.sound} onChange={(v) => { unlockAudio(); saveSettings({ sound: v }); }} />
        <Switch id="vibration" label={t("Vibration")} hint={t("A short buzz on phones that support it.")} checked={settings.vibration} onChange={(v) => saveSettings({ vibration: v })} />
        <Switch
          id="notifications"
          label={t("Notifications")}
          hint={t("“Break time! 10 minutes” and “Back to Organic Chemistry” when a block starts.")}
          checked={settings.notifications}
          onChange={toggleNotifications}
        />
        <div className="border-t border-line pt-4">
          <button type="button" className="btn" onClick={() => { unlockAudio(); chime(); }}>{t("Play test chime")}</button>
        </div>
        <p role="status" className="mt-3 text-muted empty:hidden">{msg}</p>
      </div>

      <div className="card">
        <h2 className="mb-1 text-xl font-bold">{t("Install on your phone")}</h2>
        {installed ? (
          <p className="text-muted">{t("You're using the installed app. It also works offline once you've made a plan.")}</p>
        ) : canInstall ? (
          <>
            <p className="mb-4 text-muted">{t("Open it like a normal app, with no browser bar. It keeps working offline.")}</p>
            <button type="button" className="btn btn-primary" onClick={() => promptInstall()}>{t("Install app")}</button>
          </>
        ) : isIos() ? (
          <p className="text-muted">{t("On iPhone: tap the Share button in Safari, then")} <strong className="text-ink">{t("Add to Home Screen")}</strong>.</p>
        ) : (
          <p className="text-muted">
            {t("In Chrome or Edge, open the browser menu and choose")} <strong className="text-ink">{t("Install app")}</strong> {t("or")} <strong className="text-ink">{t("Add to Home screen")}</strong>.{" "}
            {t("The install button appears here when your browser supports it.")}
          </p>
        )}
      </div>
    </section>
  );
}
