"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/supabase";
import { CRITERIA, findMatches, type MatchFields } from "@/lib/match";
import { ageText, fullName, type Person } from "@/lib/people";
import { useSettings } from "@/lib/settings";

type Candidate = MatchFields & Pick<Person, "first_name" | "surname" | "city" | "photo_path">;

const FIELDS =
  "id,first_name,surname,gender,status,date_of_birth,birth_year,approx_age,city,country,photo_path,religious_level,kosher_level,community,pref_age_min,pref_age_max,pref_religious,pref_kosher,pref_community,pref_countries,pref_anywhere";

export function PossibleMatches({ me }: { me: MatchFields }) {
  const [others, setOthers] = useState<Candidate[] | null>(null);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [paired, setPaired] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState<string | null>(null);
  const { settings } = useSettings();

  useEffect(() => {
    (async () => {
      const [{ data: p }, { data: i }] = await Promise.all([
        db().from("people").select(FIELDS).neq("gender", me.gender),
        db().from("ideas").select("person_a,person_b").or(`person_a.eq.${me.id},person_b.eq.${me.id}`),
      ]);
      const list = (p as Candidate[]) ?? [];
      setOthers(list);
      setPaired(
        new Set(
          (i ?? [])
            .flatMap((x: { person_a: string | null; person_b: string | null }) => [x.person_a, x.person_b])
            .filter((x): x is string => !!x && x !== me.id),
        ),
      );
      const paths = list.map((c) => c.photo_path).filter((x): x is string => !!x);
      if (paths.length) {
        const { data: signed } = await db().storage.from("photos").createSignedUrls(paths, 600);
        const map: Record<string, string> = {};
        signed?.forEach((s) => {
          if (s.path && s.signedUrl) map[s.path] = s.signedUrl;
        });
        setPhotos(map);
      }
    })();
  }, [me.id, me.gender]);

  const matches = useMemo(
    () => (others ? findMatches(me, others, new Date(), { excludeOnHold: settings.hide_on_hold }) : []),
    [me, others, settings.hide_on_hold],
  );
  const hasPrefs = !!(
    me.pref_age_min ||
    me.pref_age_max ||
    me.pref_religious?.length ||
    me.pref_kosher?.length ||
    me.pref_community?.length ||
    me.pref_countries?.length ||
    me.pref_anywhere
  );

  async function saveIdea(otherId: string) {
    setSaving(otherId);
    const { error } = await db().from("ideas").insert({ person_a: me.id, person_b: otherId, note: "From possible matches" });
    setSaving(null);
    if (!error) setPaired((s) => new Set(s).add(otherId));
  }

  return (
    <details className="card group">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4 text-lg font-bold">
        <span className="flex items-center gap-2">
          Possible matches
          {others && <span className="rounded-full bg-cream px-2.5 py-0.5 text-sm text-wine">{matches.length}</span>}
        </span>
        <span aria-hidden="true" className="text-cream-muted transition group-open:rotate-180">⌄</span>
      </summary>
      <div className="flex flex-col gap-3 px-4 pb-4">
        <p className="text-sm text-cream-muted">
          {hasPrefs
            ? "People who fit both ways. Best fits first."
            : "Add their choices under Looking for to narrow this down."}
        </p>
        {!others && <p className="text-cream-muted">Loading…</p>}
        {others && matches.length === 0 && <p className="text-cream-muted">No one fits right now.</p>}

        <ul className="flex flex-col divide-y divide-wine-line">
          {matches.map(({ person, result }) => {
            const c = person as Candidate;
            const photo = c.photo_path ? photos[c.photo_path] : undefined;
            const fits = CRITERIA.filter(({ key }) => result[key] === "yes").map(({ label }) => label);
            const unknown = CRITERIA.length - fits.length;
            return (
              <li key={c.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <Link href={`/person?id=${c.id}`} className="flex min-w-0 flex-1 items-center gap-3 active:opacity-80">
                  {photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photo} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                  ) : (
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-cream text-sm font-bold text-wine">
                      {c.first_name[0]}
                      {c.surname[0]}
                    </span>
                  )}
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate font-bold">{fullName(c)}</span>
                    <span className="truncate text-sm text-cream-muted">{[ageText(c), c.city || c.country].filter(Boolean).join(" · ")}</span>
                    <span className="text-xs leading-snug">
                      {fits.length ? (
                        <>
                          <span className="font-semibold text-blush">{fits.map((f) => `✓ ${f}`).join(" · ")}</span>
                          {unknown > 0 && <span className="text-cream-muted"> · {unknown} not known</span>}
                        </>
                      ) : (
                        <span className="text-cream-muted">Not enough details to compare yet</span>
                      )}
                    </span>
                  </span>
                </Link>
                {paired.has(c.id) ? (
                  <span className="shrink-0 text-xs font-semibold text-blush">In ideas ✓</span>
                ) : (
                  <button
                    type="button"
                    disabled={saving === c.id}
                    onClick={() => saveIdea(c.id)}
                    className="min-h-10 shrink-0 rounded-full border-2 border-blush px-3 text-sm font-bold"
                    aria-label={`Save ${fullName(c)} as an idea`}
                  >
                    {saving === c.id ? "…" : "+ Idea"}
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
