"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/supabase";
import { CRITERIA, findMatches, type MatchFields, type Verdict } from "@/lib/match";
import { ageText, fullName, type Person } from "@/lib/people";

type Candidate = MatchFields & Pick<Person, "first_name" | "surname" | "city">;

const FIELDS =
  "id,first_name,surname,gender,status,date_of_birth,birth_year,approx_age,city,country,religious_level,kosher_level,community,pref_age_min,pref_age_max,pref_religious,pref_kosher,pref_community,pref_countries,pref_anywhere";

const MARK: Record<Verdict, { sign: string; cls: string; word: string }> = {
  yes: { sign: "✓", cls: "bg-[#e3f1e6] text-[#1f5130]", word: "fits" },
  unknown: { sign: "?", cls: "bg-wine text-cream-muted border border-wine-line", word: "not known" },
  no: { sign: "✕", cls: "bg-cream text-wine", word: "doesn't fit" },
};

export function PossibleMatches({ me }: { me: MatchFields }) {
  const [others, setOthers] = useState<Candidate[] | null>(null);
  const [paired, setPaired] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: i }] = await Promise.all([
        db().from("people").select(FIELDS).neq("gender", me.gender),
        db().from("ideas").select("person_a,person_b").or(`person_a.eq.${me.id},person_b.eq.${me.id}`),
      ]);
      setOthers((p as Candidate[]) ?? []);
      setPaired(new Set((i ?? []).flatMap((x: { person_a: string | null; person_b: string | null }) => [x.person_a, x.person_b]).filter((x): x is string => !!x && x !== me.id)));
    })();
  }, [me.id, me.gender]);

  const matches = useMemo(() => (others ? findMatches(me, others) : []), [me, others]);
  const hasPrefs = !!(me.pref_age_min || me.pref_age_max || me.pref_religious?.length || me.pref_kosher?.length || me.pref_community?.length || me.pref_countries?.length || me.pref_anywhere);

  async function saveIdea(otherId: string) {
    setSaving(otherId);
    const { error } = await db().from("ideas").insert({ person_a: me.id, person_b: otherId, note: "From possible matches" });
    setSaving(null);
    if (!error) setPaired((s) => new Set(s).add(otherId));
  }

  return (
    <details className="card group">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4 text-lg font-bold">
        <span>
          Possible matches{" "}
          {others && <span className="ml-1 rounded-full bg-cream px-2.5 py-0.5 text-sm text-wine">{matches.length}</span>}
        </span>
        <span aria-hidden="true" className="text-cream-muted transition group-open:rotate-180">⌄</span>
      </summary>
      <div className="flex flex-col gap-3 px-4 pb-4">
        <p className="text-sm text-cream-muted">
          Available people who fit both ways: they suit what this person wants, and this person suits what they want. Missing
          details never rule anyone out; they show as ?. You make the final call.
          {!hasPrefs && " Fill in the Looking for section below to narrow this down."}
        </p>
        {!others && <p className="text-cream-muted">Loading…</p>}
        {others && matches.length === 0 && <p className="text-cream-muted">No one fits right now.</p>}
        <ul className="flex flex-col gap-3">
          {matches.map(({ person: p, result }) => {
            const c = p as Candidate;
            const idea = paired.has(c.id);
            return (
              <li key={c.id} className="flex flex-col gap-2 rounded-xl border border-wine-line p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <Link href={`/person?id=${c.id}`} className="min-w-0 truncate text-base font-bold underline underline-offset-4">
                    {fullName(c)}
                  </Link>
                  <span className="shrink-0 text-sm text-cream-muted">{[ageText(c), c.city || c.country].filter(Boolean).join(" · ")}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CRITERIA.map(({ key, label }) => (
                    <span key={key} className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${MARK[result[key]].cls}`} title={`${label}: ${MARK[result[key]].word}`}>
                      {MARK[result[key]].sign} {label}
                    </span>
                  ))}
                </div>
                {idea ? (
                  <span className="text-sm text-blush">Already in your ideas</span>
                ) : (
                  <button type="button" disabled={saving === c.id} onClick={() => saveIdea(c.id)} className="btn-ghost self-start text-sm">
                    {saving === c.id ? "Saving…" : "Save as idea"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </details>
  );
}
