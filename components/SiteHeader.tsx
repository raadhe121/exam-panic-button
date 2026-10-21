"use client";

import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { useAuth } from "./AuthProvider";
import ThemeToggle from "./ThemeToggle";

export default function SiteHeader() {
  const { user, ready, configured } = useAuth();
  return (
    <header className="no-print mb-6 flex flex-wrap items-center justify-between gap-3">
      <Link href="/" className="font-semibold tracking-tight">Exam Panic Button</Link>
      <nav aria-label="Main" className="flex flex-wrap items-center gap-2">
        {configured && ready && user && (
          <>
            <Link href="/exams" className="btn">My exams</Link>
            <button type="button" className="btn" onClick={() => getSupabase()?.auth.signOut()}>Sign out</button>
          </>
        )}
        {configured && ready && !user && <Link href="/login" className="btn">Sign in</Link>}
        <ThemeToggle />
      </nav>
    </header>
  );
}
