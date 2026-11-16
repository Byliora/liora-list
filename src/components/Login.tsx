"use client";

import { useState } from "react";
import { db } from "@/lib/supabase";
import { Wordmark } from "./Wordmark";

export function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await db().auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (!error) return;
    if (/api key/i.test(error.message)) {
      setError("The app can't connect to its database. This is a setup problem, not your password.");
    } else if (error.status === 400 || /invalid login/i.test(error.message)) {
      setError("That email and password didn't match. Check them and try again.");
    } else {
      setError("Couldn't sign in right now. Check your signal and try again.");
    }
  }

  return (
    <main className="relative flex flex-1 flex-col justify-center overflow-hidden px-6 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(246,201,207,.22)_0%,transparent_70%)]"
      />
      <form onSubmit={submit} className="relative mx-auto flex w-full max-w-sm flex-col gap-4">
        <Wordmark className="text-4xl" />
        <p className="font-display text-3xl italic leading-tight text-blush">Bringing two lights together.</p>
        <p className="text-cream-muted">Welcome back, Liora.</p>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-cream-muted">Email</span>
          <input
            id="login-email"
            type="email"
            autoComplete="username"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="field"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-cream-muted">Password</span>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="field"
          />
        </label>
        {error && (
          <p role="alert" className="rounded-lg bg-cream px-3 py-2 text-sm font-semibold text-wine">
            {error}
          </p>
        )}
        <button type="submit" disabled={busy} className="btn-primary mt-2">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
