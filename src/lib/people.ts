export const STATUSES = [
  "Available",
  "Redt",
  "Researching",
  "Dating",
  "On hold",
  "Engaged",
  "Married",
  "Withdrawn",
] as const;
export type Status = (typeof STATUSES)[number];

/** Light pill + dark text; readable on the wine background. */
export const STATUS_STYLE: Record<Status, { bg: string; fg: string }> = {
  Available: { bg: "#e3f1e6", fg: "#1f5130" },
  Redt: { bg: "#e4ecf8", fg: "#1e3a68" },
  Researching: { bg: "#ece7f6", fg: "#43306e" },
  Dating: { bg: "#f8ecd6", fg: "#6b4708" },
  "On hold": { bg: "#ececea", fg: "#45464a" },
  Engaged: { bg: "#f3e4ef", fg: "#6a2457" },
  Married: { bg: "#dcefe9", fg: "#134e40" },
  Withdrawn: { bg: "#efe9e4", fg: "#5e5148" },
};

export const RELIGIOUS_LABELS: Record<number, string> = {
  1: "Not religious",
  2: "Traditional",
  3: "Shomer Shabbat",
  4: "Fully religious",
};

export const KOSHER_LABELS: Record<number, string> = {
  1: "Not kosher",
  2: "Kosher in the home",
  3: "Kosher (eats vegetarian out)",
  4: "Chalav Yisrael",
};

/** Stored as the key; shown as the label. */
export const COMMUNITIES = [
  { key: "sephardi", label: "Sephardi" },
  { key: "ashkenazi", label: "Ashkenazi" },
  { key: "mizrachi", label: "Mizrachi" },
  { key: "yemeni", label: "Yemeni" },
  { key: "gruzini", label: "Gruzini" },
  { key: "chareidi", label: "Chareidi" },
  { key: "chabad", label: "Chabad" },
  { key: "other", label: "Other" },
] as const;

export function communityText(keys: string[] | null): string {
  if (!keys?.length) return "";
  return COMMUNITIES.filter((c) => keys.includes(c.key)).map((c) => c.label).join(", ");
}

export type Person = {
  id: string;
  first_name: string;
  surname: string;
  gender: "male" | "female";
  date_of_birth: string | null;
  birth_year: number | null;
  approx_age: number | null;
  country: string | null;
  city: string | null;
  area: string | null;
  height_cm: number | null;
  religious_level: number | null;
  kosher_level: number | null;
  community: string[] | null;
  status: Status;
  phone: string | null;
  email: string | null;
  instagram: string | null;
  linkedin: string | null;
  pref_age_min: number | null;
  pref_age_max: number | null;
  pref_religious: number[] | null;
  pref_kosher: number[] | null;
  pref_community: string[] | null;
  pref_countries: string[] | null;
  pref_anywhere: boolean;
  contact_who: "single" | "mother" | "father" | "other" | null;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  description: string | null;
  looking_for: string | null;
  private_notes: string | null;
  photo_path: string | null;
  created_at: string;
  updated_at: string;
};

export const COUNTRIES = [
  "United Kingdom",
  "Israel",
  "United States",
  "Canada",
  "Belgium",
  "France",
  "Netherlands",
  "Switzerland",
  "Germany",
  "Austria",
  "South Africa",
  "Australia",
  "Argentina",
  "Mexico",
  "Other",
];

export type Idea = {
  id: string;
  person_a: string | null;
  person_b: string | null;
  note: string | null;
  archived: boolean;
  created_at: string;
};

/** Age from whichever of date of birth / birth year / approximate age is set. */
export function ageOf(
  p: Pick<Person, "date_of_birth" | "birth_year" | "approx_age">,
  today = new Date(),
): { age: number; approx: boolean } | null {
  if (p.date_of_birth) {
    const d = new Date(p.date_of_birth + "T00:00:00");
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
    return { age, approx: false };
  }
  if (p.birth_year) return { age: today.getFullYear() - p.birth_year, approx: true };
  if (p.approx_age) return { age: p.approx_age, approx: true };
  return null;
}

export function ageText(p: Pick<Person, "date_of_birth" | "birth_year" | "approx_age">): string {
  const a = ageOf(p);
  if (!a) return "";
  return a.approx ? `c. ${a.age}` : String(a.age);
}

export function cmToFtIn(cm: number): { ft: number; inch: number } {
  const totalIn = Math.round(cm / 2.54);
  return { ft: Math.floor(totalIn / 12), inch: totalIn % 12 };
}

export function ftInToCm(ft: number, inch: number): number {
  return Math.round((ft * 12 + inch) * 2.54);
}

export function heightText(cm: number | null): string {
  if (!cm) return "";
  const { ft, inch } = cmToFtIn(cm);
  return `${cm} cm · ${ft}ft ${inch}in`;
}

/** Digits only, with country code, for tel: and wa.me links. */
export function phoneDigits(phone: string): string {
  return phone.replace(/\(0\)/g, "").replace(/[^\d+]/g, "").replace(/^00/, "+").replace(/^\+/, "");
}

export function fullName(p: Pick<Person, "first_name" | "surname">): string {
  return `${p.first_name} ${p.surname}`.trim();
}

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  return [cols.join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(","))].join("\r\n");
}

/** Accepts "@name", "name" or a full instagram.com link; returns the bare handle. */
export function cleanInstagram(v: string): string {
  return v
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, "")
    .replace(/^@/, "")
    .replace(/[/?#].*$/, "");
}

export function instagramUrl(handle: string): string {
  return `https://www.instagram.com/${encodeURIComponent(cleanInstagram(handle))}/`;
}

/** Accepts a full LinkedIn link or just the profile name from linkedin.com/in/<name>. */
export function linkedinUrl(v: string): string {
  const t = v.trim();
  if (/linkedin\.com\//i.test(t)) return /^https?:\/\//i.test(t) ? t : `https://${t.replace(/^\/+/, "")}`;
  return `https://www.linkedin.com/in/${encodeURIComponent(t.replace(/^@/, ""))}/`;
}
