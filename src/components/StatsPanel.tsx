"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useMemo } from "react";
import type { Status } from "@/lib/people";

const WorldMap = dynamic(() => import("./WorldMap").then((m) => m.WorldMap), {
  ssr: false,
  loading: () => <div className="aspect-[360/185] w-full animate-pulse rounded-xl bg-wine-card" />,
});

type P = { id: string; status: Status; country: string | null };
type I = { person_a: string | null; person_b: string | null };

const TOGETHER = new Set<Status>(["Engaged", "Married"]);
const CLOSED = new Set<Status>(["Engaged", "Married", "Withdrawn"]);

export function StatsPanel({
  people,
  ideas,
  country,
  onCountry,
}: {
  people: P[];
  ideas: I[];
  country: string | null;
  onCountry: (c: string | null) => void;
}) {
  const stats = useMemo(() => {
    const byId = new Map(people.map((p) => [p.id, p]));
    const pairs = new Set<string>();
    for (const i of ideas) {
      const a = i.person_a && byId.get(i.person_a);
      const b = i.person_b && byId.get(i.person_b);
      if (a && b && TOGETHER.has(a.status) && TOGETHER.has(b.status)) pairs.add([a.id, b.id].sort().join("|"));
    }
    const counts: Record<string, number> = {};
    for (const p of people) if (p.country) counts[p.country] = (counts[p.country] ?? 0) + 1;
    return {
      total: people.length,
      active: people.filter((p) => !CLOSED.has(p.status)).length,
      dating: people.filter((p) => p.status === "Dating").length,
      couples: pairs.size,
      counts,
      unplaced: people.filter((p) => !p.country).length,
    };
  }, [people, ideas]);

  const tiles: { n: number; label: string; sub: string; href?: string }[] = [
    { n: stats.total, label: "On the list", sub: `${stats.active} active` },
    { n: stats.dating, label: "Dating now", sub: stats.dating === 1 ? "1 person" : `${stats.dating} people` },
    { n: stats.couples, label: "Couples", sub: "engaged or married", href: "/mazal-tov" },
  ];
  const chips = Object.entries(stats.counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  return (
    <section className="flex flex-col gap-3" aria-label="Your list at a glance">
      <div className="grid grid-cols-3 gap-2">
        {tiles.map((t) => {
          const body = (
            <>
              <span className="font-display text-4xl font-semibold leading-none text-blush">{t.n}</span>
              <span className="text-sm font-bold leading-tight">{t.label}</span>
              <span className="text-xs leading-tight text-cream-muted">
                {t.sub}
                {t.href ? " ›" : ""}
              </span>
            </>
          );
          return t.href ? (
            <Link key={t.label} href={t.href} className="card flex min-w-0 flex-col items-start gap-0.5 px-3 py-3 active:opacity-80">
              {body}
            </Link>
          ) : (
            <div key={t.label} className="card flex min-w-0 flex-col items-start gap-0.5 px-3 py-3">
              {body}
            </div>
          );
        })}
      </div>

      <details open className="card group">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 font-bold">
          Where they are
          <span aria-hidden="true" className="text-cream-muted transition group-open:rotate-180">⌄</span>
        </summary>
        <div className="flex flex-col gap-3 px-3 pb-3">
          <WorldMap counts={stats.counts} selected={country} onSelect={onCountry} />
          {chips.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {chips.map(([c, n]) => {
                const on = country === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => onCountry(on ? null : c)}
                    aria-pressed={on}
                    className={`min-h-9 rounded-full border px-3 text-sm font-semibold ${on ? "border-cream bg-cream text-wine" : "border-wine-line"}`}
                  >
                    {c} · {n}
                  </button>
                );
              })}
            </div>
          )}
          <p className="text-xs text-cream-muted">
            {country ? `Showing people in ${country} only. Tap it again to show everyone.` : "Tap a country to show just the people there."}
            {stats.unplaced ? ` ${stats.unplaced} with no country set.` : ""}
          </p>
        </div>
      </details>
    </section>
  );
}
