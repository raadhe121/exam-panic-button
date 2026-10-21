"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { getSupabase } from "@/lib/supabase";

export default function LoginPage() {
  const { user, ready, configured } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && user) router.replace("/exams");
  }, [ready, user, router]);

  if (!configured) {
    return (
      <section className="mx-auto w-full max-w-2xl">
        <h1 className="mb-2 text-3xl font-bold">Accounts aren&apos;t set up yet</h1>
        <p className="text-muted">The site owner needs to add the Supabase keys. You can still make a plan without signing in.</p>
      </section>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setMsg("");
    const sb = getSupabase()!;
    if (mode === "up") {
      const { data, error } = await sb.auth.signUp({ email, password });
      if (error) setErr(error.message);
      else if (!data.session) setMsg("Check your email to confirm your account, then sign in.");
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) setErr(error.message);
    }
    setBusy(false);
  };

  return (
    <section className="mx-auto w-full max-w-2xl">
      <h1 className="mb-1 text-3xl font-bold">{mode === "in" ? "Sign in" : "Create your account"}</h1>
      <p className="mb-6 text-muted">Save your exams and keep notes, flashcards and quizzes in one place.</p>
      <form className="card flex flex-col gap-4" onSubmit={submit}>
        <div className="flex flex-col gap-1">
          <label htmlFor="email" className="font-semibold">Email</label>
          <input id="email" type="email" autoComplete="email" required className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="password" className="font-semibold">Password</label>
          <input
            id="password"
            type="password"
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            required
            minLength={6}
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <p aria-live="polite" className={err ? "text-danger" : "text-good"}>{err || msg}</p>
        <div className="flex flex-wrap justify-between gap-3">
          <button type="button" className="btn" onClick={() => setMode(mode === "in" ? "up" : "in")}>
            {mode === "in" ? "I need an account" : "I already have an account"}
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{mode === "in" ? "Sign in" : "Sign up"}</button>
        </div>
      </form>
    </section>
  );
}
