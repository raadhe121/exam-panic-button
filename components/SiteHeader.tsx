"use client";

import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";
import ThemeToggle from "./ThemeToggle";

export default function SiteHeader() {
  const { user, ready, configured } = useAuth();
  return (
    <header className="no-print mb-10 flex flex-wrap items-center justify-between gap-3">
      <Link href="/" className="flex items-center gap-3 font-bold tracking-tight">
        <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-accentink">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </span>
        Exam Panic Button
      </Link>
      <nav aria-label="Main" className="flex flex-wrap items-center gap-1 sm:gap-2">
        <Link href="/settings" aria-label="Settings" className="flex h-11 w-11 items-center justify-center rounded-lg text-muted hover:text-ink">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3h0a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8v0a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z" />
          </svg>
        </Link>
        {configured && ready && user && (
          <>
            <Link href="/exams" className="rounded-lg px-3 py-2 font-semibold text-muted hover:text-ink">My exams</Link>
            <ThemeToggle />
            <button type="button" className="btn" onClick={() => getSupabase()?.auth.signOut()}>Sign out</button>
          </>
        )}
        {configured && ready && !user && (
          <>
            <ThemeToggle />
            <Link href="/login" className="btn">Sign in</Link>
          </>
        )}
        {!(configured && ready) && <ThemeToggle />}
      </nav>
    </header>
  );
}
