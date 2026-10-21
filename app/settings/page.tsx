"use client";

import { useEffect, useState } from "react";
import { askNotificationPermission, chime, notificationsSupported, unlockAudio } from "@/lib/alerts";
import { isIos, isStandalone, promptInstall, useCanInstall } from "@/lib/pwa";
import { saveSettings, useSettings } from "@/lib/settings";
import { applyTheme } from "@/lib/theme";

function Switch({ id, label, hint, checked, onChange }: { id: string; label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
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
        <span className="sr-only">{checked ? "On" : "Off"}</span>
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const settings = useSettings();
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

  const chooseTheme = (t: "dark" | "light") => {
    applyTheme(t);
    setTheme(t);
  };

  const toggleNotifications = async (on: boolean) => {
    setMsg("");
    if (!on) return saveSettings({ notifications: false });
    if (!notificationsSupported()) return setMsg("This browser doesn't support notifications.");
    if (await askNotificationPermission()) {
      saveSettings({ notifications: true });
      setMsg("Notifications are on. We'll ping you when a block starts while the app is in the background.");
    } else {
      setMsg("Notifications are blocked. Allow them in your browser's site settings, then try again.");
    }
  };

  return (
    <section className="mx-auto w-full max-w-2xl">
      <h1 className="page-title mb-2">Settings</h1>
      <p className="mb-8 text-lg text-muted">Saved on this device.</p>

      <div className="card mb-6">
        <div className="py-2">
          <p className="mb-2 font-semibold" id="theme-label">Theme</p>
          <div role="radiogroup" aria-labelledby="theme-label" className="grid grid-cols-2 gap-2">
            {(["dark", "light"] as const).map((t) => (
              <label key={t} className="seg justify-center">
                <input type="radio" className="sr-only" name="theme" checked={theme === t} onChange={() => chooseTheme(t)} />
                {t === "dark" ? "Dark (night)" : "Light"}
              </label>
            ))}
          </div>
        </div>
        <div className="border-t border-line py-4">
          <label htmlFor="sleep-hours" className="font-semibold">Default sleep</label>
          <p className="mb-2 text-sm text-muted">Used to suggest your bedtime before the exam.</p>
          <select
            id="sleep-hours"
            className="input !w-auto"
            value={settings.sleepHours}
            onChange={(e) => saveSettings({ sleepHours: Number(e.target.value) })}
          >
            {[5, 6, 7, 8, 9, 10].map((h) => (
              <option key={h} value={h}>{h} hours before the exam{h === 7 ? " (recommended)" : ""}</option>
            ))}
          </select>
        </div>
        <Switch id="sound" label="Sound" hint="A soft chime when a block ends." checked={settings.sound} onChange={(v) => { unlockAudio(); saveSettings({ sound: v }); }} />
        <Switch id="vibration" label="Vibration" hint="A short buzz on phones that support it." checked={settings.vibration} onChange={(v) => saveSettings({ vibration: v })} />
        <Switch
          id="notifications"
          label="Notifications"
          hint="“Break time! 10 minutes” and “Back to Organic Chemistry” when a block starts."
          checked={settings.notifications}
          onChange={toggleNotifications}
        />
        <div className="border-t border-line pt-4">
          <button type="button" className="btn" onClick={() => { unlockAudio(); chime(); }}>Play test chime</button>
        </div>
        <p role="status" className="mt-3 text-muted empty:hidden">{msg}</p>
      </div>

      <div className="card">
        <h2 className="mb-1 text-xl font-bold">Install on your phone</h2>
        {installed ? (
          <p className="text-muted">You&apos;re using the installed app. It also works offline once you&apos;ve made a plan.</p>
        ) : canInstall ? (
          <>
            <p className="mb-4 text-muted">Open it like a normal app, with no browser bar. It keeps working offline.</p>
            <button type="button" className="btn btn-primary" onClick={() => promptInstall()}>Install app</button>
          </>
        ) : isIos() ? (
          <p className="text-muted">On iPhone: tap the Share button in Safari, then <strong className="text-ink">Add to Home Screen</strong>.</p>
        ) : (
          <p className="text-muted">
            In Chrome or Edge, open the browser menu and choose <strong className="text-ink">Install app</strong> or <strong className="text-ink">Add to Home screen</strong>.
            The install button appears here when your browser supports it.
          </p>
        )}
      </div>
    </section>
  );
}
