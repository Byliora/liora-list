"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { Shell, signOut } from "@/components/Shell";
import { Star } from "@/components/Star";
import { db } from "@/lib/supabase";
import { COUNTRIES, toCsv } from "@/lib/people";
import { useSettings } from "@/lib/settings";
import { PERSONAL_NOTE } from "@/lib/note";

function download(name: string, csv: string) {
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

function Toggle({ id, checked, onChange, label, hint }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string; hint: string }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center justify-between gap-4">
      <span className="flex flex-col">
        <span className="font-semibold">{label}</span>
        <span className="text-sm text-cream-muted">{hint}</span>
      </span>
      <span className="relative inline-flex shrink-0">
        <input id={id} type="checkbox" role="switch" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-8 w-14 rounded-full border-2 border-wine-line bg-wine transition peer-checked:border-cream peer-checked:bg-cream peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-blush" />
        <span className="absolute left-1 top-1 h-6 w-6 rounded-full bg-cream-muted transition peer-checked:translate-x-6 peer-checked:bg-wine" />
      </span>
    </label>
  );
}

function SettingsCard() {
  const { settings, loaded, save } = useSettings();
  const [note, setNote] = useState<string | null>(null);
  async function update(patch: Parameters<typeof save>[0]) {
    const ok = await save(patch);
    setNote(ok ? "Saved." : "Couldn't save that setting. Check your signal and try again.");
  }
  return (
    <section className="card flex flex-col gap-4 p-4">
      <h2 className="text-lg font-bold">Settings</h2>
      <fieldset className="flex flex-col gap-2" disabled={!loaded}>
        <legend className="mb-1 font-semibold">Show People as</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["cards", "list"] as const).map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={settings.people_view === v}
              onClick={() => update({ people_view: v })}
              className={`min-h-12 rounded-xl border-2 font-bold ${settings.people_view === v ? "border-cream bg-cream text-wine" : "border-wine-line"}`}
            >
              {v === "cards" ? "Cards" : "List"}
            </button>
          ))}
        </div>
      </fieldset>
      <Toggle
        id="hide-on-hold"
        checked={settings.hide_on_hold}
        onChange={(v) => update({ hide_on_hold: v })}
        label="Leave “On hold” out of matches"
        hint="People on hold won't appear in Possible matches."
      />
      <label className="flex flex-col gap-1">
        <span className="font-semibold">Default country for new people</span>
        <select id="default-country" className="field" value={settings.default_country ?? ""} onChange={(e) => update({ default_country: e.target.value || null })}>
          <option value="">None</option>
          {COUNTRIES.filter((c) => c !== "Other").map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </label>
      {note && (
        <p role="status" className="text-sm text-blush">
          {note}
        </p>
      )}
    </section>
  );
}

function PasswordCard() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (pw.length < 8) return setMsg({ ok: false, text: "Use at least 8 characters." });
    if (pw !== pw2) return setMsg({ ok: false, text: "The two passwords don't match. Type them again." });
    setBusy(true);
    const { error } = await db().auth.updateUser({ password: pw });
    setBusy(false);
    if (error) {
      setMsg({
        ok: false,
        text: /same|different/i.test(error.message)
          ? "That's your current password. Choose a new one."
          : /weak|short|characters/i.test(error.message)
            ? "That password is too easy to guess. Try a longer one."
            : "Couldn't change your password. Check your signal and try again.",
      });
      return;
    }
    setPw("");
    setPw2("");
    setMsg({ ok: true, text: "Password changed. Use the new one next time you sign in." });
  }

  return (
    <form onSubmit={submit} className="card flex flex-col gap-3 p-4">
      <h2 className="text-lg font-bold">Change password</h2>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-cream-muted">New password</span>
        <input id="new-password" type={show ? "text" : "password"} autoComplete="new-password" className="field" value={pw} onChange={(e) => setPw(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-cream-muted">Type it again</span>
        <input id="new-password-2" type={show ? "text" : "password"} autoComplete="new-password" className="field" value={pw2} onChange={(e) => setPw2(e.target.value)} />
      </label>
      <label className="flex items-center gap-2 text-sm text-cream-muted">
        <input id="show-password" type="checkbox" className="h-5 w-5 accent-cream" checked={show} onChange={(e) => setShow(e.target.checked)} />
        Show passwords
      </label>
      <p className="text-sm text-cream-muted">At least 8 characters. A short phrase is easiest to remember, e.g. three words with a number.</p>
      {msg && (
        <p role={msg.ok ? "status" : "alert"} className={msg.ok ? "font-semibold text-blush" : "rounded-lg bg-cream px-3 py-2 font-semibold text-wine"}>
          {msg.text}
        </p>
      )}
      <button type="submit" disabled={busy || !pw} className="btn-primary">
        {busy ? "Saving…" : "Save new password"}
      </button>
    </form>
  );
}

function More() {
  const [status, setStatus] = useState<string | null>(null);

  async function exportAll() {
    setStatus("Preparing…");
    const [{ data: people, error: e1 }, { data: ideas, error: e2 }] = await Promise.all([
      db().from("people").select("*").order("surname"),
      db().from("ideas").select("*").order("created_at"),
    ]);
    if (e1 || e2) {
      setStatus("Couldn't export. Check your signal and try again.");
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    download(`Liora List people ${stamp}.csv`, toCsv(people ?? []));
    if (ideas && ideas.length) download(`Liora List ideas ${stamp}.csv`, toCsv(ideas));
    setStatus(`Exported ${people?.length ?? 0} people and ${ideas?.length ?? 0} ideas.`);
  }

  return (
    <Shell title="More">
      <section aria-label={`A note from ${PERSONAL_NOTE.signature}`} className="relative overflow-hidden rounded-2xl border border-blush/40 bg-[linear-gradient(160deg,var(--wine-band),var(--wine-card))] px-5 pb-5 pt-6">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(246,201,207,.25)_0%,transparent_70%)]" />
        <Star className="absolute right-5 top-5 h-5 w-5 text-blush" />
        <div className="relative flex flex-col gap-3 font-display text-xl italic leading-snug text-cream">
          <p className="text-2xl text-blush">{PERSONAL_NOTE.greeting}</p>
          {PERSONAL_NOTE.body.map((line) => (
            <p key={line}>{line}</p>
          ))}
          <p className="self-end pr-2 text-2xl text-blush">{PERSONAL_NOTE.signature}</p>
        </div>
      </section>

      <Link href="/mazal-tov" className="card relative flex items-center justify-between gap-3 overflow-hidden p-4 active:opacity-80">
        <span className="flex flex-col">
          <span className="font-display text-3xl italic text-blush">Mazal tov wall</span>
          <span className="text-sm text-cream-muted">Every couple brought together</span>
        </span>
        <Star className="h-8 w-8 shrink-0 text-blush" />
      </Link>

      <SettingsCard />
      <PasswordCard />

      <section className="card flex flex-col gap-3 p-4">
        <h2 className="text-lg font-bold">Back up your list</h2>
        <p className="text-cream-muted">
          Downloads everything as spreadsheet files, including private notes. Keep them somewhere safe, such as your password
          manager or a private folder, and don&apos;t send them to anyone. Doing this once a week is a good habit.
        </p>
        <button type="button" className="btn-primary" onClick={exportAll}>
          Download spreadsheet
        </button>
        {status && (
          <p role="status" className="text-blush">
            {status}
          </p>
        )}
      </section>

      <section className="card flex flex-col gap-2 p-4">
        <h2 className="text-lg font-bold">Put it on your home screen</h2>
        <ol className="list-decimal space-y-1 pl-5 text-cream-muted">
          <li>Open this page in Safari on your iPhone.</li>
          <li>Tap the Share button (the square with an arrow).</li>
          <li>Scroll down and tap &ldquo;Add to Home Screen&rdquo;, then &ldquo;Add&rdquo;.</li>
        </ol>
      </section>

      <button type="button" className="btn-ghost" onClick={() => signOut()}>
        Sign out
      </button>
    </Shell>
  );
}

export default function Page() {
  return (
    <AuthGate>
      <More />
    </AuthGate>
  );
}
