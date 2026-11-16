"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Shell } from "@/components/Shell";
import { StatusPill } from "@/components/StatusPill";
import { db } from "@/lib/supabase";
import { prepareJpeg } from "@/lib/photo";
import { PossibleMatches } from "./PossibleMatches";
import { useSettings } from "@/lib/settings";
import {
  COMMUNITIES,
  COUNTRIES,
  KOSHER_LABELS,
  RELIGIOUS_LABELS,
  communityText,
  cleanInstagram,
  instagramUrl,
  linkedinUrl,
  STATUSES,
  ageText,
  cmToFtIn,
  ftInToCm,
  fullName,
  phoneDigits,
  type Person,
} from "@/lib/people";

type Draft = Omit<Person, "id" | "created_at" | "updated_at">;

const EMPTY: Draft = {
  first_name: "",
  surname: "",
  gender: "female",
  date_of_birth: null,
  birth_year: null,
  approx_age: null,
  country: null,
  city: null,
  area: null,
  height_cm: null,
  religious_level: null,
  kosher_level: null,
  community: null,
  status: "Available",
  phone: null,
  email: null,
  instagram: null,
  linkedin: null,
  pref_age_min: null,
  pref_age_max: null,
  pref_religious: null,
  pref_kosher: null,
  pref_community: null,
  pref_countries: null,
  pref_anywhere: false,
  contact_who: null,
  contact_name: null,
  contact_phone: null,
  contact_email: null,
  description: null,
  looking_for: null,
  private_notes: null,
  photo_path: null,
};


function Section({ title, open, children }: { title: string; open?: boolean; children: ReactNode }) {
  return (
    <details open={open} className="card group">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between px-4 text-lg font-bold">
        {title}
        <span aria-hidden="true" className="text-cream-muted transition group-open:rotate-180">⌄</span>
      </summary>
      <div className="flex flex-col gap-3 px-4 pb-4">{children}</div>
    </details>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm text-cream-muted">{label}</span>
      {children}
      {hint && <span className="text-sm text-cream-muted">{hint}</span>}
    </label>
  );
}

function LevelSlider({
  id,
  label,
  labels,
  value,
  onChange,
}: {
  id: string;
  label: string;
  labels: Record<number, string>;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const steps = Object.keys(labels).map(Number);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-cream-muted">{label}</span>
        <span className="text-right font-bold">{value ? labels[value] : "Not set"}</span>
      </div>
      <input
        id={id}
        type="range"
        min={steps[0]}
        max={steps[steps.length - 1]}
        step={1}
        value={value ?? Math.ceil(steps.length / 2)}
        onChange={(e) => onChange(Number(e.target.value))}
        className={`liora-range ${value ? "" : "unset"}`}
        aria-label={label}
        aria-valuetext={value ? labels[value] : "Not set"}
      />
      {/* Labels sit exactly under each stop; the 17px matches half the 34px handle. */}
      <div className="relative h-14 text-xs leading-tight text-cream-muted" aria-hidden="true">
        {steps.map((n, i) => {
          const frac = i / (steps.length - 1);
          const edge = i === 0 ? "left-0 text-left" : i === steps.length - 1 ? "right-0 text-right" : "-translate-x-1/2 text-center";
          return (
            <span
              key={n}
              className={`absolute top-0 w-[24%] ${edge} ${value === n ? "font-bold text-cream" : ""}`}
              style={i === 0 || i === steps.length - 1 ? undefined : { left: `calc(17px + ${frac} * (100% - 34px))` }}
            >
              {labels[n]}
            </span>
          );
        })}
      </div>
      {value ? (
        <button type="button" className="self-start text-sm text-cream-muted underline underline-offset-4" onClick={() => onChange(null)}>
          Clear (not set)
        </button>
      ) : (
        <span className="text-sm text-cream-muted">Not set yet. Drag the handle to choose.</span>
      )}
    </div>
  );
}

const AGE_FLOOR = 18;
const AGE_CEIL = 60;

/** Two-handle age slider. Untouched = no age preference. */
function AgeRange({
  min,
  max,
  onChange,
}: {
  min: number | null;
  max: number | null;
  onChange: (lo: number | null, hi: number | null) => void;
}) {
  const set = min != null || max != null;
  const lo = min ?? AGE_FLOOR;
  const hi = max ?? AGE_CEIL;
  const pct = (v: number) => ((v - AGE_FLOOR) / (AGE_CEIL - AGE_FLOOR)) * 100;
  const shown = set ? `${lo} – ${hi}${hi >= AGE_CEIL ? "+" : ""}` : "No preference";
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-cream-muted">Age range</span>
        <span className="font-bold tabular-nums">{shown}</span>
      </div>
      <div className={`dual-range ${set ? "" : "unset"}`}>
        <div className="dual-range-track" />
        <div className="dual-range-fill" style={{ left: `calc(17px + ${pct(lo) / 100} * (100% - 34px))`, right: `calc(17px + ${1 - pct(hi) / 100} * (100% - 34px))` }} />
        <input
          id="pref_age_min"
          type="range"
          min={AGE_FLOOR}
          max={AGE_CEIL}
          step={1}
          value={lo}
          aria-label="Youngest age"
          aria-valuetext={`${lo}`}
          onChange={(e) => onChange(Math.min(Number(e.target.value), hi), max ?? hi)}
          style={{ zIndex: lo > AGE_CEIL - 5 ? 4 : 3 }}
        />
        <input
          id="pref_age_max"
          type="range"
          min={AGE_FLOOR}
          max={AGE_CEIL}
          step={1}
          value={hi}
          aria-label="Oldest age"
          aria-valuetext={`${hi}`}
          onChange={(e) => onChange(min ?? lo, Math.max(Number(e.target.value), lo))}
        />
      </div>
      <div className="flex justify-between text-xs text-cream-muted">
        <span>{AGE_FLOOR}</span>
        <span>30</span>
        <span>40</span>
        <span>50</span>
        <span>{AGE_CEIL}+</span>
      </div>
      {set ? (
        <button type="button" className="self-start text-sm text-cream-muted underline underline-offset-4" onClick={() => onChange(null, null)}>
          Clear (no preference)
        </button>
      ) : (
        <span className="text-sm text-cream-muted">Drag either handle to set a range.</span>
      )}
    </div>
  );
}

function ChipPicker<T extends string | number>({
  legend,
  hint,
  options,
  value,
  onChange,
}: {
  legend: string;
  hint?: string;
  options: { value: T; label: string }[];
  value: T[] | null;
  onChange: (v: T[] | null) => void;
}) {
  const chosen = value ?? [];
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-sm text-cream-muted">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = chosen.includes(o.value);
          return (
            <button
              key={String(o.value)}
              type="button"
              aria-pressed={on}
              onClick={() => {
                const next = on ? chosen.filter((x) => x !== o.value) : [...chosen, o.value];
                const ordered = options.map((x) => x.value).filter((v) => next.includes(v));
                onChange(ordered.length ? ordered : null);
              }}
              className={`min-h-11 rounded-full border-2 px-4 text-sm font-semibold ${on ? "border-cream bg-cream text-wine" : "border-wine-line"}`}
            >
              {on ? "✓ " : ""}
              {o.label}
            </button>
          );
        })}
      </div>
      <span className="text-sm text-cream-muted">{hint ?? (chosen.length ? "" : "Nothing ticked = no preference.")}</span>
    </fieldset>
  );
}

function ContactButtons({ phone, email }: { phone: string | null; email: string | null }) {
  if (!phone && !email) return null;
  const d = phone ? phoneDigits(phone) : "";
  return (
    <div className="flex flex-wrap gap-2">
      {phone && (
        <>
          <a href={`tel:+${d}`} className="btn-ghost flex items-center">Call</a>
          <a href={`https://wa.me/${d}`} target="_blank" rel="noreferrer" className="btn-ghost flex items-center">WhatsApp</a>
        </>
      )}
      {email && <a href={`mailto:${email}`} className="btn-ghost flex items-center">Email</a>}
    </div>
  );
}

function SocialButtons({ instagram, linkedin }: { instagram: string | null; linkedin: string | null }) {
  if (!instagram && !linkedin) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {instagram && (
        <a href={instagramUrl(instagram)} target="_blank" rel="noreferrer" className="btn-ghost flex items-center gap-2">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
          </svg>
          Instagram
        </a>
      )}
      {linkedin && (
        <a href={linkedinUrl(linkedin)} target="_blank" rel="noreferrer" className="btn-ghost flex items-center gap-2">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="currentColor">
            <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.5h4V21H3V9.5Zm7 0h3.8v1.6h.06c.53-1 1.84-2.06 3.79-2.06 4.05 0 4.8 2.67 4.8 6.13V21h-4v-5.1c0-1.22-.02-2.78-1.7-2.78-1.7 0-1.96 1.33-1.96 2.7V21H10V9.5Z" />
          </svg>
          LinkedIn
        </a>
      )}
    </div>
  );
}

export function PersonForm() {
  const params = useSearchParams();
  const router = useRouter();
  const id = params.get("id");
  const isNew = !id;

  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [loaded, setLoaded] = useState(isNew);
  const [cities, setCities] = useState<string[]>([]);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<Blob | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [duplicate, setDuplicate] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [ageMode, setAgeMode] = useState<"dob" | "year" | "approx">("dob");
  const { settings } = useSettings();
  const [touchedCountry, setTouchedCountry] = useState(false);
  // New people start with her default country (until she picks another).
  const country = isNew && draft.country === null && !touchedCountry ? settings.default_country : draft.country;

  useEffect(() => {
    (async () => {
      const { data: c } = await db().from("people").select("city").not("city", "is", null);
      setCities([...new Set((c ?? []).map((r: { city: string }) => r.city))].sort());
      if (!id) return;
      const { data, error } = await db().from("people").select("*").eq("id", id).single();
      if (error || !data) {
        setMessage({ kind: "error", text: "Couldn't load this person. They may have been deleted." });
        setLoaded(true);
        return;
      }
      const p = data as Person;
      setDraft(p);
      setAgeMode(p.date_of_birth ? "dob" : p.birth_year ? "year" : p.approx_age ? "approx" : "dob");
      if (p.photo_path) {
        const { data: s } = await db().storage.from("photos").createSignedUrl(p.photo_path, 60 * 10);
        if (s) setPhotoUrl(s.signedUrl);
      }
      setLoaded(true);
    })();
  }, [id]);

  function set<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setDuplicate(null);
  }
  const text = (key: keyof Draft) => ({
    value: (draft[key] as string | null) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      set(key, (e.target.value === "" ? null : e.target.value) as never),
  });
  const num = (v: string) => (v === "" ? null : Number(v));

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const jpeg = await prepareJpeg(file);
      setPhotoFile(jpeg);
      setPhotoUrl(URL.createObjectURL(jpeg));
    } catch {
      setMessage({ kind: "error", text: "That photo couldn't be read. Try a JPEG or PNG, or a screenshot of it." });
    }
  }

  async function save(force = false) {
    setMessage(null);
    if (!draft.first_name?.trim() || !draft.surname?.trim()) {
      setMessage({ kind: "error", text: "First name and surname are needed before saving." });
      return;
    }
    setSaving(true);
    try {
      if (isNew && !force) {
        const { data: same } = await db()
          .from("people")
          .select("id,first_name,surname,date_of_birth,birth_year,approx_age")
          .ilike("first_name", draft.first_name.trim())
          .ilike("surname", draft.surname.trim());
        if (same && same.length) {
          const p = same[0] as Person;
          const age = ageText(p);
          setDuplicate(`${fullName(p)}${age ? `, age ${age},` : ""} is already in your list.`);
          setSaving(false);
          return;
        }
      }
      const clean: Draft = {
        ...draft,
        country,
        first_name: draft.first_name.trim(),
        surname: draft.surname.trim(),
        city: draft.city?.trim() || null,
        date_of_birth: ageMode === "dob" ? draft.date_of_birth : null,
        birth_year: ageMode === "year" ? draft.birth_year : null,
        approx_age: ageMode === "approx" ? draft.approx_age : null,
      };
      let personId = id;
      if (isNew) {
        const { data, error } = await db().from("people").insert(clean).select("id").single();
        if (error) throw error;
        personId = data.id;
      } else {
        const { error } = await db().from("people").update(clean).eq("id", id);
        if (error) throw error;
      }
      if (photoFile && personId) {
        const { data: u } = await db().auth.getUser();
        const path = `${u.user?.id}/${personId}-${Date.now()}.jpg`;
        const { error: upErr } = await db().storage.from("photos").upload(path, photoFile, { contentType: "image/jpeg" });
        if (upErr) throw upErr;
        if (draft.photo_path) await db().storage.from("photos").remove([draft.photo_path]);
        await db().from("people").update({ photo_path: path }).eq("id", personId);
        setDraft((d) => ({ ...d, photo_path: path }));
        setPhotoFile(null);
      }
      if (isNew) {
        router.replace(`/person?id=${personId}`);
      }
      setMessage({ kind: "ok", text: "Saved." });
    } catch {
      setMessage({ kind: "error", text: "Couldn't save. Check your signal and tap Save again; nothing you typed has been lost." });
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!id) return;
    setSaving(true);
    if (draft.photo_path) await db().storage.from("photos").remove([draft.photo_path]);
    const { error } = await db().from("people").delete().eq("id", id);
    setSaving(false);
    if (error) {
      setMessage({ kind: "error", text: "Couldn't delete. Check your signal and try again." });
      return;
    }
    router.replace("/");
  }

  const ft = draft.height_cm ? cmToFtIn(draft.height_cm) : null;

  if (!loaded) {
    return (
      <Shell title="Loading…" back={{ href: "/", label: "People" }}>
        <p className="text-cream-muted">Loading…</p>
      </Shell>
    );
  }

  return (
    <Shell
      title={isNew ? "Add a person" : fullName(draft) || "Person"}
      back={{ href: "/", label: "People" }}
    >
      {!isNew && (
        <div className="card flex flex-col gap-3 p-4">
          <div className="flex items-center gap-3">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="" className="h-32 w-28 shrink-0 rounded-2xl object-cover" />
            ) : null}
            <div className="flex flex-col items-start gap-1">
              <StatusPill status={draft.status} />
              <span className="text-cream-muted">{[ageText(draft) && `Age ${ageText(draft)}`, draft.city].filter(Boolean).join(" · ")}</span>
              {(draft.religious_level || draft.kosher_level || draft.community?.length) ? (
                <span className="text-sm text-cream-muted">
                  {[draft.religious_level && RELIGIOUS_LABELS[draft.religious_level], draft.kosher_level && KOSHER_LABELS[draft.kosher_level], communityText(draft.community)].filter(Boolean).join(" · ")}
                </span>
              ) : null}
            </div>
          </div>
          {(draft.contact_who || draft.contact_phone || draft.phone || draft.contact_email || draft.email) && (<div className="flex flex-col gap-1">
            <span className="text-sm text-cream-muted">
              Main contact
              {draft.contact_who
                ? `: ${draft.contact_who === "other" ? draft.contact_name || "other" : draft.contact_who}${draft.contact_who !== "other" && draft.contact_name ? ` (${draft.contact_name})` : ""}`
                : ""}
            </span>
            <ContactButtons phone={draft.contact_phone || draft.phone} email={draft.contact_email || draft.email} />
          </div>)}
          <SocialButtons instagram={draft.instagram} linkedin={draft.linkedin} />
        </div>
      )}

      {!isNew && id && <PossibleMatches me={{ ...draft, id }} />}

      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        <Section title="Basics" open>
          <div className="grid grid-cols-2 gap-3">
            <Field label="First name *">
              <input id="first_name" className="field" required autoCapitalize="words" {...text("first_name")} />
            </Field>
            <Field label="Surname *">
              <input id="surname" className="field" required autoCapitalize="words" {...text("surname")} />
            </Field>
          </div>
          <fieldset className="flex flex-col gap-1">
            <legend className="mb-1 text-sm text-cream-muted">Gender *</legend>
            <div className="grid grid-cols-2 gap-2">
              {(["female", "male"] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => set("gender", g)}
                  aria-pressed={draft.gender === g}
                  className={`min-h-12 rounded-xl border-2 font-bold ${draft.gender === g ? "border-cream bg-cream text-wine" : "border-wine-line"}`}
                >
                  {g === "female" ? "Female" : "Male"}
                </button>
              ))}
            </div>
          </fieldset>
          <Field label="Status">
            <select id="status" className="field" value={draft.status} onChange={(e) => set("status", e.target.value as Draft["status"])}>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </Field>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm text-cream-muted">Age</legend>
            <div className="grid grid-cols-3 gap-2 text-sm">
              {(
                [
                  ["dob", "Date of birth"],
                  ["year", "Year of birth"],
                  ["approx", "Roughly"],
                ] as const
              ).map(([m, l]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setAgeMode(m)}
                  aria-pressed={ageMode === m}
                  className={`min-h-11 rounded-xl border-2 font-semibold ${ageMode === m ? "border-cream bg-cream text-wine" : "border-wine-line"}`}
                >
                  {l}
                </button>
              ))}
            </div>
            {ageMode === "dob" && <input id="dob" type="date" className="field" {...text("date_of_birth")} aria-label="Date of birth" />}
            {ageMode === "year" && (
              <input id="birth_year" type="number" inputMode="numeric" placeholder="e.g. 1999" className="field" value={draft.birth_year ?? ""} onChange={(e) => set("birth_year", num(e.target.value))} aria-label="Year of birth" />
            )}
            {ageMode === "approx" && (
              <input id="approx_age" type="number" inputMode="numeric" placeholder="e.g. 27" className="field" value={draft.approx_age ?? ""} onChange={(e) => set("approx_age", num(e.target.value))} aria-label="Approximate age" />
            )}
            {ageText({
              date_of_birth: ageMode === "dob" ? draft.date_of_birth : null,
              birth_year: ageMode === "year" ? draft.birth_year : null,
              approx_age: ageMode === "approx" ? draft.approx_age : null,
            }) && (
              <span className="text-sm text-cream-muted">
                Age now:{" "}
                {ageText({
                  date_of_birth: ageMode === "dob" ? draft.date_of_birth : null,
                  birth_year: ageMode === "year" ? draft.birth_year : null,
                  approx_age: ageMode === "approx" ? draft.approx_age : null,
                })}
                {ageMode !== "dob" ? " (approximate)" : ""}
              </span>
            )}
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm text-cream-muted">Height</legend>
            <div className="grid grid-cols-3 gap-2">
              <input id="height_cm" type="number" inputMode="numeric" placeholder="cm" className="field" value={draft.height_cm ?? ""} onChange={(e) => set("height_cm", num(e.target.value))} aria-label="Height in cm" />
              <input
                id="height_ft"
                type="number"
                inputMode="numeric"
                placeholder="ft"
                className="field"
                value={ft?.ft ?? ""}
                onChange={(e) => {
                  const f = Number(e.target.value || 0);
                  set("height_cm", f ? ftInToCm(f, ft?.inch ?? 0) : null);
                }}
                aria-label="Height feet"
              />
              <input
                id="height_in"
                type="number"
                inputMode="numeric"
                placeholder="in"
                className="field"
                value={ft?.inch ?? ""}
                onChange={(e) => set("height_cm", ftInToCm(ft?.ft ?? 5, Number(e.target.value || 0)))}
                aria-label="Height inches"
              />
            </div>
            {ft && (
              <span className="text-sm text-cream-muted">
                {draft.height_cm} cm = {ft.ft}ft {ft.inch}in
              </span>
            )}
          </fieldset>

          <Field label="Country">
            <select
              id="country"
              className="field"
              value={country ?? ""}
              onChange={(e) => {
                setTouchedCountry(true);
                set("country", e.target.value || null);
              }}
            >
              <option value="">Not set</option>
              {COUNTRIES.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="City" hint={cities.length ? "Pick from the list where you can, to keep spellings the same." : undefined}>
            <input id="city" className="field" list="city-list" autoCapitalize="words" {...text("city")} />
            <datalist id="city-list">
              {cities.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>
          <Field label="Area or neighbourhood">
            <input id="area" className="field" {...text("area")} />
          </Field>

          <LevelSlider
            id="religious_level"
            label="Religious level"
            labels={RELIGIOUS_LABELS}
            value={draft.religious_level}
            onChange={(v) => set("religious_level", v)}
          />
          <LevelSlider
            id="kosher_level"
            label="Kosher"
            labels={KOSHER_LABELS}
            value={draft.kosher_level}
            onChange={(v) => set("kosher_level", v)}
          />

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm text-cream-muted">Type (tick all that apply)</legend>
            <div className="grid grid-cols-2 gap-2">
              {COMMUNITIES.map((c) => {
                const on = draft.community?.includes(c.key) ?? false;
                return (
                  <label
                    key={c.key}
                    className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-2 px-3 font-semibold ${on ? "border-cream bg-cream text-wine" : "border-wine-line"}`}
                  >
                    <input
                      id={`community-${c.key}`}
                      type="checkbox"
                      className="h-5 w-5 accent-wine"
                      checked={on}
                      onChange={(e) => {
                        const cur = new Set(draft.community ?? []);
                        if (e.target.checked) cur.add(c.key);
                        else cur.delete(c.key);
                        const next = COMMUNITIES.map((x) => x.key).filter((k) => cur.has(k));
                        set("community", next.length ? next : null);
                      }}
                    />
                    {c.label}
                  </label>
                );
              })}
            </div>
          </fieldset>
        </Section>

        <Section title="Contact and social" open={isNew}>
          <Field label="Who to contact">
            <select id="contact_who" className="field" {...text("contact_who")}>
              <option value="">Not set</option>
              <option value="single">The single</option>
              <option value="mother">Mother</option>
              <option value="father">Father</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Their name">
            <input id="contact_name" className="field" {...text("contact_name")} />
          </Field>
          <Field label="Their phone" hint="With country code, e.g. +44 7700 900000">
            <input id="contact_phone" type="tel" className="field" {...text("contact_phone")} />
          </Field>
          <Field label="Their email">
            <input id="contact_email" type="email" className="field" {...text("contact_email")} />
          </Field>
          <Field label="The single's own phone">
            <input id="phone" type="tel" className="field" {...text("phone")} />
          </Field>
          <Field label="The single's own email">
            <input id="email" type="email" className="field" {...text("email")} />
          </Field>
          <Field label="Instagram" hint="Their handle, e.g. @sarah.cohen, or paste their profile link.">
            <input
              id="instagram"
              className="field"
              autoCapitalize="none"
              autoCorrect="off"
              inputMode="url"
              value={draft.instagram ? `@${draft.instagram}` : ""}
              onChange={(e) => set("instagram", cleanInstagram(e.target.value) || null)}
            />
          </Field>
          <Field label="LinkedIn" hint="Paste their profile link from the LinkedIn app (Share profile, then Copy link).">
            <input id="linkedin" className="field" autoCapitalize="none" autoCorrect="off" inputMode="url" {...text("linkedin")} />
          </Field>
        </Section>

        <Section title="About">
          <Field label="Short description">
            <textarea id="description" rows={4} className="field" {...text("description")} />
          </Field>
        </Section>

        <Section title="Looking for">
          <p className="text-sm text-cream-muted">
            Tick what they&apos;d be happy with. These choices drive the Possible matches list below.
          </p>
          <AgeRange
            min={draft.pref_age_min}
            max={draft.pref_age_max}
            onChange={(lo, hi) => {
              // Either end of the slider means "no limit on that side".
              set("pref_age_min", lo == null || lo <= AGE_FLOOR ? null : lo);
              set("pref_age_max", hi == null || hi >= AGE_CEIL ? null : hi);
            }}
          />
          <ChipPicker
            legend="Religious level"
            options={Object.entries(RELIGIOUS_LABELS).map(([v, l]) => ({ value: Number(v), label: l }))}
            value={draft.pref_religious}
            onChange={(v) => set("pref_religious", v)}
          />
          <ChipPicker
            legend="Kosher"
            options={Object.entries(KOSHER_LABELS).map(([v, l]) => ({ value: Number(v), label: l }))}
            value={draft.pref_kosher}
            onChange={(v) => set("pref_kosher", v)}
          />
          <ChipPicker
            legend="Type"
            options={COMMUNITIES.map((c) => ({ value: c.key as string, label: c.label }))}
            value={draft.pref_community}
            onChange={(v) => set("pref_community", v)}
          />
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm text-cream-muted">Location</legend>
            <button
              type="button"
              aria-pressed={draft.pref_anywhere}
              onClick={() => set("pref_anywhere", !draft.pref_anywhere)}
              className={`min-h-12 rounded-xl border-2 px-4 text-left font-semibold ${draft.pref_anywhere ? "border-cream bg-cream text-wine" : "border-wine-line"}`}
            >
              {draft.pref_anywhere ? "✓ " : ""}Open to anywhere
            </button>
            {!draft.pref_anywhere && (
              <ChipPicker
                legend="Or only these countries"
                options={COUNTRIES.filter((c) => c !== "Other").map((c) => ({ value: c, label: c }))}
                value={draft.pref_countries}
                onChange={(v) => set("pref_countries", v)}
              />
            )}
          </fieldset>
          <Field label="Anything else they're looking for" hint="Must-haves, dealbreakers, personality. Not used for matching.">
            <textarea id="looking_for" rows={4} className="field" {...text("looking_for")} />
          </Field>
        </Section>

        <Section title="Photo">
          {photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="" className="max-h-80 w-full rounded-xl object-cover" />
          )}
          <label className="btn-ghost flex cursor-pointer items-center justify-center">
            {photoUrl ? "Replace photo" : "Add photo"}
            <input id="photo" type="file" accept="image/*" className="sr-only" onChange={onPhoto} />
          </label>
          <span className="text-sm text-cream-muted">Photos are shrunk and their location data removed before upload.</span>
        </Section>

        <Section title="Private notes">
          <Field label="Only you ever see these" hint="Never shared with anyone.">
            <textarea id="private_notes" rows={5} className="field" {...text("private_notes")} />
          </Field>
        </Section>

        {duplicate && (
          <div role="alert" className="flex flex-col gap-2 rounded-xl bg-cream p-4 text-wine">
            <p className="font-semibold">{duplicate} Is this the same person?</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="min-h-11 rounded-lg bg-wine px-4 font-bold text-cream" onClick={() => save(true)}>
                No, save as new
              </button>
              <Link href="/" className="flex min-h-11 items-center rounded-lg border-2 border-wine px-4 font-bold">
                Yes, go back
              </Link>
            </div>
          </div>
        )}
        {message && (
          <p role={message.kind === "error" ? "alert" : "status"} className={`rounded-lg px-3 py-2 font-semibold ${message.kind === "error" ? "bg-cream text-wine" : "text-blush"}`}>
            {message.text}
          </p>
        )}

        <div className="sticky bottom-20 z-[5] flex gap-2 rounded-2xl bg-wine/90 py-2 backdrop-blur">
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? "Saving…" : "Save"}
          </button>
        </div>

        {!isNew && (
          <div className="mt-6 flex flex-col gap-2">
            {!confirmDelete ? (
              <button type="button" className="self-start text-cream-muted underline underline-offset-4" onClick={() => setConfirmDelete(true)}>
                Delete this person
              </button>
            ) : (
              <div className="flex flex-col gap-2 rounded-xl bg-cream p-4 text-wine">
                <p className="font-semibold">Delete {fullName(draft)} and their photo for good? This can&apos;t be undone.</p>
                <div className="flex gap-2">
                  <button type="button" className="min-h-11 rounded-lg bg-wine px-4 font-bold text-cream" onClick={remove}>
                    Delete for good
                  </button>
                  <button type="button" className="min-h-11 rounded-lg border-2 border-wine px-4 font-bold" onClick={() => setConfirmDelete(false)}>
                    Keep
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </form>
    </Shell>
  );
}
