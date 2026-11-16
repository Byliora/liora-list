"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { Shell } from "@/components/Shell";
import { db } from "@/lib/supabase";
import { fullName, type Idea, type Person } from "@/lib/people";

type P = Pick<Person, "id" | "first_name" | "surname" | "gender">;

const fetchAll = () =>
  Promise.all([
    db().from("ideas").select("*").order("created_at", { ascending: false }),
    db().from("people").select("id,first_name,surname,gender").order("first_name"),
  ]);

function Ideas() {
  const [ideas, setIdeas] = useState<Idea[] | null>(null);
  const [people, setPeople] = useState<P[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function apply([{ data: i, error: e1 }, { data: p }]: Awaited<ReturnType<typeof fetchAll>>) {
    if (e1) setError("Couldn't load ideas. Check your signal and reload the page.");
    setIdeas((i as Idea[]) ?? []);
    setPeople((p as P[]) ?? []);
  }
  const load = () => fetchAll().then(apply);
  useEffect(() => {
    fetchAll().then(apply);
  }, []);

  const byId = useMemo(() => Object.fromEntries(people.map((p) => [p.id, p])), [people]);
  const name = (id: string | null) => (id ? (byId[id] ? fullName(byId[id]) : "Deleted profile") : null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!a && !b && !note.trim()) return;
    setBusy(true);
    const { error } = await db().from("ideas").insert({ person_a: a || null, person_b: b || null, note: note.trim() || null });
    setBusy(false);
    if (error) {
      setError("Couldn't save the idea. Check your signal and try again.");
      return;
    }
    setA("");
    setB("");
    setNote("");
    setError(null);
    load();
  }

  async function setArchived(id: string, archived: boolean) {
    await db().from("ideas").update({ archived }).eq("id", id);
    load();
  }

  const shown = (ideas ?? []).filter((i) => i.archived === showArchived);

  return (
    <Shell title="Ideas">
      <form onSubmit={add} className="card flex flex-col gap-3 p-4">
        <p className="font-bold">Jot down an idea</p>
        <select id="idea-a" aria-label="First person" className="field" value={a} onChange={(e) => setA(e.target.value)}>
          <option value="">Choose a person (optional)</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {fullName(p)}
            </option>
          ))}
        </select>
        <select id="idea-b" aria-label="Second person" className="field" value={b} onChange={(e) => setB(e.target.value)}>
          <option value="">…and maybe (optional)</option>
          {people
            .filter((p) => !a || p.id !== a)
            .map((p) => (
              <option key={p.id} value={p.id}>
                {fullName(p)}
              </option>
            ))}
        </select>
        <textarea id="idea-note" rows={3} className="field" placeholder="e.g. someone from Antwerp for Sarah?" value={note} onChange={(e) => setNote(e.target.value)} aria-label="Note" />
        {error && <p role="alert" className="rounded-lg bg-cream px-3 py-2 font-semibold text-wine">{error}</p>}
        <button type="submit" disabled={busy} className="btn-primary">
          {busy ? "Saving…" : "Save idea"}
        </button>
      </form>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{showArchived ? "Archived" : "Current ideas"}</h2>
        <button type="button" className="text-cream-muted underline underline-offset-4" onClick={() => setShowArchived((s) => !s)}>
          {showArchived ? "Show current" : "Show archived"}
        </button>
      </div>
      {!ideas && <p className="text-cream-muted">Loading…</p>}
      {ideas && shown.length === 0 && <p className="text-cream-muted">{showArchived ? "Nothing archived yet." : "No ideas yet. Your first one goes in the box above."}</p>}
      <ul className="flex flex-col gap-3">
        {shown.map((i) => (
          <li key={i.id} className="card flex flex-col gap-2 p-4">
            <p className="text-lg font-bold">
              {[i.person_a, i.person_b].filter(Boolean).map((pid, k) => (
                <span key={pid}>
                  {k > 0 && <span className="font-display italic text-blush"> &amp; </span>}
                  {byId[pid!] ? (
                    <Link href={`/person?id=${pid}`} className="underline underline-offset-4">
                      {name(pid)}
                    </Link>
                  ) : (
                    name(pid)
                  )}
                </span>
              ))}
              {!i.person_a && !i.person_b && "Idea"}
            </p>
            {i.note && <p className="whitespace-pre-wrap">{i.note}</p>}
            <div className="flex items-center justify-between text-sm text-cream-muted">
              <span>{new Date(i.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
              <button type="button" className="min-h-11 underline underline-offset-4" onClick={() => setArchived(i.id, !i.archived)}>
                {i.archived ? "Restore" : "Archive"}
              </button>
            </div>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

export default function Page() {
  return (
    <AuthGate>
      <Ideas />
    </AuthGate>
  );
}
