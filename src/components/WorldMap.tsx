"use client";

import { geoCentroid, geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { GeometryCollection, Topology } from "topojson-specification";
import world from "world-atlas/countries-110m.json";

/** Our country names → names used in the map data. */
const MAP_NAME: Record<string, string> = { "United States": "United States of America" };

type Props = {
  counts: Record<string, number>;
  selected: string | null;
  onSelect: (country: string | null) => void;
};

const W = 360;
const H = 185;

const topo = world as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
const countries = (feature(topo, topo.objects.countries) as FeatureCollection<Geometry, { name: string }>).features.filter(
  (f) => f.properties.name !== "Antarctica",
);
const projection = geoNaturalEarth1().fitExtent(
  [
    [4, 4],
    [W - 4, H - 4],
  ],
  { type: "FeatureCollection", features: countries } as FeatureCollection,
);
const path = geoPath(projection);
const byName = new Map(countries.map((f) => [f.properties.name, f]));

export function WorldMap({ counts, selected, onSelect }: Props) {
  const max = Math.max(1, ...Object.values(counts));
  const entries = Object.entries(counts)
    .filter(([c]) => c !== "Other")
    .sort((a, b) => b[1] - a[1]);

  const dots = entries
    .map(([country, n]) => {
      const f = byName.get(MAP_NAME[country] ?? country) as Feature | undefined;
      if (!f) return null;
      const xy = projection(geoCentroid(f));
      if (!xy) return null;
      return { country, n, x: xy[0], y: xy[1] };
    })
    .filter((d): d is { country: string; n: number; x: number; y: number } => d !== null)
    .map((d) => ({ ...d, r: 5 + 7 * Math.sqrt(d.n / max), x0: d.x, y0: d.y }));

  // Nudge overlapping dots apart (Europe is crowded at this size); a thin line
  // then joins each moved dot to its country.
  for (let step = 0; step < 60; step++) {
    let moved = false;
    for (let i = 0; i < dots.length; i++) {
      for (let j = i + 1; j < dots.length; j++) {
        const a = dots[i];
        const b = dots[j];
        let dx = b.x - a.x;
        let dy = b.y - a.y;
        let dist = Math.hypot(dx, dy);
        const need = a.r + b.r + 1.5;
        if (dist >= need) continue;
        if (dist < 0.01) {
          dx = 1;
          dy = 0;
          dist = 1;
        }
        const push = (need - dist) / 2;
        a.x -= (dx / dist) * push;
        a.y -= (dy / dist) * push;
        b.x += (dx / dist) * push;
        b.y += (dy / dist) * push;
        moved = true;
      }
    }
    if (!moved) break;
  }
  for (const d of dots) {
    d.x = Math.min(W - d.r - 1, Math.max(d.r + 1, d.x));
    d.y = Math.min(H - d.r - 1, Math.max(d.r + 1, d.y));
  }

  const shade = (name: string) => {
    const ours = Object.keys(counts).find((c) => (MAP_NAME[c] ?? c) === name);
    const n = ours ? counts[ours] : 0;
    if (!n) return { fill: "var(--wine-card)", opacity: 1 };
    return { fill: "var(--blush)", opacity: 0.35 + 0.6 * (n / max) };
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label="Map of where people on the list live">
      {countries.map((f) => {
        const s = shade(f.properties.name);
        return (
          <path
            key={f.properties.name}
            d={path(f) ?? undefined}
            fill={s.fill}
            fillOpacity={s.opacity}
            stroke="var(--wine-line)"
            strokeWidth={0.4}
          />
        );
      })}
      {dots.map((d) =>
        Math.hypot(d.x - d.x0, d.y - d.y0) > 2 ? (
          <g key={`${d.country}-pin`}>
            <line x1={d.x0} y1={d.y0} x2={d.x} y2={d.y} stroke="var(--cream)" strokeOpacity={0.7} strokeWidth={0.8} />
            <circle cx={d.x0} cy={d.y0} r={1.6} fill="var(--cream)" />
          </g>
        ) : null,
      )}
      {dots.map((d) => {
        const r = d.r;
        const on = selected === d.country;
        return (
          <g key={d.country} onClick={() => onSelect(on ? null : d.country)} className="cursor-pointer">
            <title>{`${d.country}: ${d.n}`}</title>
            <circle cx={d.x} cy={d.y} r={r + 6} fill="transparent" />
            <circle cx={d.x} cy={d.y} r={r} fill="var(--grad-end)" stroke={on ? "var(--cream)" : "var(--wine)"} strokeWidth={on ? 2.5 : 1.5} />
            <text x={d.x} y={d.y + 3.5} textAnchor="middle" fontSize={r > 8 ? 10 : 8.5} fontWeight={700} fill="var(--cream)" style={{ fontFamily: "var(--font-sans)" }}>
              {d.n}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
