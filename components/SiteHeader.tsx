"use client";

import Link from "next/link";
import { Suspense } from "react";
import { usePathname } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { useT } from "@/lib/i18n-client";
import { useAuth } from "./AuthProvider";
import LanguagePicker from "./LanguagePicker";
import ThemeToggle from "./ThemeToggle";

const ICON = { width: 22, height: 22, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true } as const;

function NavItem({ href, label, active, children }: { href: string; label: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-xs font-semibold ${active ? "text-accent" : "text-muted"}`}
    >
      {children}
      <span className="max-w-full truncate">{label}</span>
    </Link>
  );
}

/** Phone-style tab bar. Hidden on larger screens, where the top bar carries the same links. */
function BottomNav() {
  const { user, ready, configured } = useAuth();
  const t = useT();
  const path = usePathname();
  if (path === "/countdown") return null;
  const account = configured && ready && user ? { href: "/exams", label: t("My exams") } : { href: "/login", label: t("Sign in") };
  return (
    <nav aria-label={t("Main")} className="bottom-nav no-print fixed inset-x-0 bottom-0 z-30 flex sm:hidden">
      <NavItem href="/" label={t("Plan")} active={path === "/"}>
        <svg {...ICON}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
      </NavItem>
      <NavItem href="/history" label={t("History")} active={path === "/history"}>
        <svg {...ICON}><path d="M4 5.5A1.5 1.5 0 015.5 4H11v15H5.5A1.5 1.5 0 014 17.5z" /><path d="M20 5.5A1.5 1.5 0 0018.5 4H13v15h5.5a1.5 1.5 0 001.5-1.5z" /></svg>
      </NavItem>
      {configured && (
        <NavItem href={account.href} label={account.label} active={path === account.href || path.startsWith("/exams")}>
          <svg {...ICON}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></svg>
        </NavItem>
      )}
      <NavItem href="/settings" label={t("Settings")} active={path === "/settings"}>
        <svg {...ICON}><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1" /></svg>
      </NavItem>
    </nav>
  );
}

export default function SiteHeader() {
  const { user, ready, configured } = useAuth();
  const t = useT();
  return (
    <>
    <header className="no-print mb-6 flex items-center justify-between gap-2 sm:mb-10 sm:flex-wrap sm:gap-3">
      <Link href="/" className="flex min-h-11 min-w-0 items-center gap-3 font-bold tracking-tight">
        <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accentink">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </span>
        <span className="truncate"><span className="hidden min-[420px]:inline">Exam </span>Panic Button</span>
      </Link>
      <div className="flex shrink-0 items-center gap-1 sm:hidden">
        <LanguagePicker />
        <ThemeToggle />
      </div>
      <nav aria-label={t("Main")} className="hidden flex-wrap items-center gap-1 sm:flex sm:gap-2">
        <Link href="/settings" aria-label={t("Settings")} className="flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:text-ink">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3h0a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8v0a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
          </svg>
        </Link>
        <Link href="/history" className="inline-flex min-h-11 items-center rounded-lg px-3 font-semibold text-muted hover:text-ink">{t("History")}</Link>
        {configured && ready && user && (
          <>
            <Link href="/exams" className="inline-flex min-h-11 items-center rounded-lg px-3 font-semibold text-muted hover:text-ink">{t("My exams")}</Link>
            <LanguagePicker />
            <ThemeToggle />
            <button type="button" className="btn" onClick={() => getSupabase()?.auth.signOut()}>{t("Sign out")}</button>
          </>
        )}
        {configured && ready && !user && (
          <>
            <LanguagePicker />
            <ThemeToggle />
            <Link href="/login" className="btn">{t("Sign in")}</Link>
          </>
        )}
        {!(configured && ready) && (
          <>
            <LanguagePicker />
            <ThemeToggle />
          </>
        )}
      </nav>
    </header>
    <Suspense fallback={null}>
      <BottomNav />
    </Suspense>
    </>
  );
}
