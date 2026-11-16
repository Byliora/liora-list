"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { Shell } from "@/components/Shell";
import { Star } from "@/components/Star";
import { db } from "@/lib/supabase";
import type { Person, Status } from "@/lib/people";

type P = Pick<Person, "id" | "first_name" | "surname" | "status" | "photo_path" | "city">;
type IdeaRow = {
  id: string;
  person_a: string | null;
  person_b: string | null;
  created_at: string;
  engaged_on: string | null;
  wedding_on: string | null;
};

const TOGETHER = new Set<Status>(["Engaged", "Married"]);

function niceDate(d: string | null) {
  return d ? new Date(d + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : null;
}

function Face({ p, url }: { p: P; url?: string }) {
  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="h-20 w-20 rounded-full border-4 border-wine-card object-cover" />
  ) : (
    <span className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-wine-card bg-cream font-display text-2xl italic text-wine">
      {p.first_name[0]}
      {p.surname[0]}
    </span>
  );
}

function Wall() {
  const [people, setPeople] = useState<P[] | null>(null);
  const [ideas, setIdeas] = useState<IdeaRow[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: p, error: e1 }, { data: i, error: e2 }] = await Promise.all([
        db().from("people").select("id,first_name,surname,status,photo_path,city"),
        db().from("ideas").select("id,person_a,person_b,created_at,engaged_on,wedding_on"),
      ]);
      if (e1 || e2) {
        setError("Couldn't load the wall. Check your signal and reload the page.");
        return;
      }
      setPeople((p as P[]) ?? []);
      setIdeas((i as IdeaRow[]) ?? []);
      const paths = ((p as P[]) ?? []).filter((x) => TOGETHER.has(x.status)).map((x) => x.photo_path).filter((x): x is string => !!x);
      if (paths.length) {
        const { data: signed } = await db().storage.from("photos").createSignedUrls(paths, 600);
        const map: Record<string, string> = {};
        signed?.forEach((s) => {
          if (s.path && s.signedUrl) map[s.path] = s.signedUrl;
        });
        setPhotos(map);
      }
    })();
  }, []);

  const couples = useMemo(() => {
    if (!people) return [];
    const byId = new Map(people.map((p) => [p.id, p]));
    const seen = new Set<string>();
    const out: { idea: IdeaRow; a: P; b: P; married: boolean }[] = [];
    for (const idea of ideas) {
      const a = idea.person_a ? byId.get(idea.person_a) : undefined;
      const b = idea.person_b ? byId.get(idea.person_b) : undefined;
      if (!a || !b || !TOGETHER.has(a.status) || !TOGETHER.has(b.status)) continue;
      const key = [a.id, b.id].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ idea, a, b, married: a.status === "Married" || b.status === "Married" || !!idea.wedding_on });
    }
    const when = (i: IdeaRow) => i.wedding_on ?? i.engaged_on ?? i.created_at.slice(0, 10);
    return out.sort((x, y) => when(y.idea).localeCompare(when(x.idea)));
  }, [people, ideas]);

  async function setDate(ideaId: string, field: "engaged_on" | "wedding_on", value: string) {
    const v = value || null;
    setIdeas((list) => list.map((i) => (i.id === ideaId ? { ...i, [field]: v } : i)));
    const { error } = await db().from("ideas").update({ [field]: v }).eq("id", ideaId);
    if (error) setError("Couldn't save that date. Check your signal and try again.");
  }

  return (
    <Shell title="Mazal tov" back={{ href: "/more", label: "More" }}>
      <section className="relative overflow-hidden rounded-2xl bg-[linear-gradient(150deg,var(--wine-band),var(--wine-card))] px-5 py-6">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(246,201,207,.28)_0%,transparent_70%)]" />
        <Star className="absolute right-6 top-5 h-6 w-6 text-blush" />
        <Star className="absolute right-14 top-12 h-3 w-3 text-blush/70" />
        <p className="relative font-display text-5xl font-semibold leading-none text-blush">{people ? couples.length : "…"}</p>
        <p className="relative mt-1 text-lg font-bold">{couples.length === 1 ? "couple" : "couples"} brought together</p>
        <p className="relative mt-1 text-sm text-cream-muted">Every one of them started as an idea on your list.</p>
      </section>

      {error && <p role="alert" className="rounded-lg bg-cream px-3 py-2 font-semibold text-wine">{error}</p>}
      {!people && !error && <p className="text-cream-muted">Loading…</p>}
      {people && couples.length === 0 && (
        <div className="card flex flex-col gap-2 p-5">
          <p className="font-display text-2xl italic text-blush">Your first mazal tov will appear here</p>
          <p className="text-cream-muted">
            When two people linked by an idea are both marked Engaged or Married, they&apos;re added to this wall automatically.
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-4">
        {couples.map(({ idea, a, b, married }) => (
          <li key={idea.id} className="card flex flex-col items-center gap-3 px-4 pb-4 pt-5 text-center">
            <div className="flex items-center">
              <Face p={a} url={a.photo_path ? photos[a.photo_path] : undefined} />
              <span className="z-10 -mx-3 flex h-9 w-9 items-center justify-center rounded-full bg-blush text-wine">
                <Star className="h-4 w-4" />
              </span>
              <Face p={b} url={b.photo_path ? photos[b.photo_path] : undefined} />
            </div>
            <p className="font-display text-3xl italic leading-tight text-blush">
              <Link href={`/person?id=${a.id}`}>{a.first_name}</Link>
              <span className="text-cream"> &amp; </span>
              <Link href={`/person?id=${b.id}`}>{b.first_name}</Link>
            </p>
            <p className="-mt-2 text-sm text-cream-muted">
              {a.first_name} {a.surname} · {b.first_name} {b.surname}
            </p>
            <span className="rounded-full bg-cream px-3 py-0.5 text-sm font-bold text-wine">{married ? "Married" : "Engaged"}</span>
            <p className="text-sm text-cream-muted">
              {[niceDate(idea.engaged_on) && `Engaged ${niceDate(idea.engaged_on)}`, niceDate(idea.wedding_on) && `Wedding ${niceDate(idea.wedding_on)}`]
                .filter(Boolean)
                .join(" · ") || "Add the dates below"}
            </p>
            <div className="grid w-full grid-cols-2 gap-2 text-left">
              <label className="flex min-w-0 flex-col gap-1">
                <span className="text-xs text-cream-muted">Engagement date</span>
                <input id={`engaged-${idea.id}`} type="date" className="field" value={idea.engaged_on ?? ""} onChange={(e) => setDate(idea.id, "engaged_on", e.target.value)} />
              </label>
              <label className="flex min-w-0 flex-col gap-1">
                <span className="text-xs text-cream-muted">Wedding date</span>
                <input id={`wedding-${idea.id}`} type="date" className="field" value={idea.wedding_on ?? ""} onChange={(e) => setDate(idea.id, "wedding_on", e.target.value)} />
              </label>
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
      <Wall />
    </AuthGate>
  );
}
