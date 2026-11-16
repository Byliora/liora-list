"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Shell } from "@/components/Shell";
import { StatusPill } from "@/components/StatusPill";
import { db } from "@/lib/supabase";
import { prepareJpeg } from "@/lib/photo";
import {
  RELIGIOUS_LABELS,
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
  status: "Available",
  phone: null,
  email: null,
  contact_who: null,
  contact_name: null,
  contact_phone: null,
  contact_email: null,
  description: null,
  looking_for: null,
  private_notes: null,
  photo_path: null,
};

const COUNTRIES = [
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
  const rel = draft.religious_level;

  if (!loaded) {
    return (
      <Shell title="Loading…">
        <p className="text-cream-muted">Loading…</p>
      </Shell>
    );
  }

  return (
    <Shell
      title={isNew ? "Add a person" : fullName(draft) || "Person"}
      action={
        <Link href="/" className="text-cream-muted underline underline-offset-4">
          Back
        </Link>
      }
    >
      {!isNew && (
        <div className="card flex flex-col gap-3 p-4">
          <div className="flex items-center gap-3">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="" className="h-20 w-20 rounded-full object-cover" />
            ) : null}
            <div className="flex flex-col items-start gap-1">
              <StatusPill status={draft.status} />
              <span className="text-cream-muted">{[ageText(draft) && `Age ${ageText(draft)}`, draft.city].filter(Boolean).join(" · ")}</span>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm text-cream-muted">
              Main contact
              {draft.contact_who
                ? `: ${draft.contact_who === "other" ? draft.contact_name || "other" : draft.contact_who}${draft.contact_who !== "other" && draft.contact_name ? ` (${draft.contact_name})` : ""}`
                : ""}
            </span>
            <ContactButtons phone={draft.contact_phone || draft.phone} email={draft.contact_email || draft.email} />
          </div>
        </div>
      )}

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
            <select id="country" className="field" {...text("country")}>
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

          <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-cream-muted">Religious level</span>
              <span className="font-bold">{rel ? `${rel} · ${RELIGIOUS_LABELS[rel]}` : "Not set"}</span>
            </div>
            <input
              id="religious_level"
              type="range"
              min={1}
              max={10}
              step={1}
              value={rel ?? 5}
              onChange={(e) => set("religious_level", Number(e.target.value))}
              className={`liora-range ${rel ? "" : "unset"}`}
              aria-label="Religious level, 1 Modern Orthodox to 10 Chareidi"
            />
            <div className="flex justify-between text-xs text-cream-muted">
              <span>Modern</span>
              <span>Centrist</span>
              <span>Yeshivish</span>
              <span>Chareidi</span>
            </div>
            {rel && (
              <button type="button" className="self-start text-sm text-cream-muted underline underline-offset-4" onClick={() => set("religious_level", null)}>
                Clear (not set)
              </button>
            )}
          </div>
        </Section>

        <Section title="Main contact" open={isNew}>
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
        </Section>

        <Section title="About and looking for">
          <Field label="Short description">
            <textarea id="description" rows={4} className="field" {...text("description")} />
          </Field>
          <Field label="What they're looking for">
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
