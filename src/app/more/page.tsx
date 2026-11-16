"use client";

import { useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { Shell, signOut } from "@/components/Shell";
import { db } from "@/lib/supabase";
import { toCsv } from "@/lib/people";

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
      <section className="card flex flex-col gap-3 p-4">
        <h2 className="text-lg font-bold">Back up your list</h2>
        <p className="text-cream-muted">
          Downloads everything as spreadsheet files, including private notes. Keep them somewhere safe, such as
          your password manager or a private folder, and don&apos;t send them to anyone. Doing this once a week
          is a good habit.
        </p>
        <button type="button" className="btn-primary" onClick={exportAll}>
          Download spreadsheet
        </button>
        {status && <p role="status" className="text-blush">{status}</p>}
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
