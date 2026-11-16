import { ageOf, type Person } from "./people";

export type MatchFields = Pick<
  Person,
  | "id"
  | "gender"
  | "status"
  | "date_of_birth"
  | "birth_year"
  | "approx_age"
  | "country"
  | "religious_level"
  | "kosher_level"
  | "community"
  | "pref_age_min"
  | "pref_age_max"
  | "pref_religious"
  | "pref_kosher"
  | "pref_community"
  | "pref_countries"
  | "pref_anywhere"
>;

/** yes = fits both ways, no = fails at least one way, unknown = not enough information to say. */
export type Verdict = "yes" | "no" | "unknown";
export type CriterionKey = "age" | "religious" | "kosher" | "type" | "location";
export const CRITERIA: { key: CriterionKey; label: string }[] = [
  { key: "age", label: "Age" },
  { key: "religious", label: "Religious" },
  { key: "kosher", label: "Kosher" },
  { key: "type", label: "Type" },
  { key: "location", label: "Location" },
];

const NOT_AVAILABLE = new Set(["Dating", "Engaged", "Married", "Withdrawn"]);

/** One direction: does `them` fit what `me` is looking for? */
function oneWay(me: MatchFields, them: MatchFields, key: CriterionKey, today: Date): Verdict {
  switch (key) {
    case "age": {
      if (me.pref_age_min == null && me.pref_age_max == null) return "unknown";
      const a = ageOf(them, today);
      if (!a) return "unknown";
      // An approximate age gets a year's grace either side.
      const slack = a.approx ? 1 : 0;
      if (me.pref_age_min != null && a.age + slack < me.pref_age_min) return "no";
      if (me.pref_age_max != null && a.age - slack > me.pref_age_max) return "no";
      return "yes";
    }
    case "religious":
      if (!me.pref_religious?.length || them.religious_level == null) return "unknown";
      return me.pref_religious.includes(them.religious_level) ? "yes" : "no";
    case "kosher":
      if (!me.pref_kosher?.length || them.kosher_level == null) return "unknown";
      return me.pref_kosher.includes(them.kosher_level) ? "yes" : "no";
    case "type":
      if (!me.pref_community?.length || !them.community?.length) return "unknown";
      return them.community.some((c) => me.pref_community!.includes(c)) ? "yes" : "no";
    case "location":
      if (me.pref_anywhere) return "yes";
      if (!me.pref_countries?.length || !them.country) return "unknown";
      return me.pref_countries.includes(them.country) ? "yes" : "no";
  }
}

function combine(a: Verdict, b: Verdict): Verdict {
  if (a === "no" || b === "no") return "no";
  if (a === "yes" && b === "yes") return "yes";
  return "unknown";
}

export type Match = { person: MatchFields; result: Record<CriterionKey, Verdict>; fits: number; unknowns: number };

/**
 * Opposite-gender people who are available and fit in BOTH directions.
 * Missing information never rules someone out; it shows as unknown.
 * Sorted by most confirmed fits, then fewest unknowns.
 */
export function findMatches(me: MatchFields, everyone: MatchFields[], today = new Date()): Match[] {
  const out: Match[] = [];
  for (const them of everyone) {
    if (them.id === me.id || them.gender === me.gender || NOT_AVAILABLE.has(them.status)) continue;
    const result = {} as Record<CriterionKey, Verdict>;
    let fits = 0;
    let unknowns = 0;
    let fail = false;
    for (const { key } of CRITERIA) {
      const v = combine(oneWay(me, them, key, today), oneWay(them, me, key, today));
      result[key] = v;
      if (v === "no") fail = true;
      else if (v === "yes") fits++;
      else unknowns++;
    }
    if (!fail) out.push({ person: them, result, fits, unknowns });
  }
  return out.sort((a, b) => b.fits - a.fits || a.unknowns - b.unknowns);
}
