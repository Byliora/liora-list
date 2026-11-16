"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { Shell } from "@/components/Shell";
import { StatusPill } from "@/components/StatusPill";
import { StatsPanel } from "@/components/StatsPanel";
import { db } from "@/lib/supabase";
import { STATUSES, ageText, fullName, heightText, type Person } from "@/lib/people";

type Row = Pick<
  Person,
  | "id"
  | "first_name"
  | "surname"
  | "gender"
  | "date_of_birth"
  | "birth_year"
  | "approx_age"
  | "city"
  | "country"
  | "height_cm"
  | "status"
  | "photo_path"
>;

const CLOSED = new Set(["Engaged", "Married", "Withdrawn"]);

function PeopleList() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [gender, setGender] = useState<"all" | "male" | "female">("all");
  const [status, setStatus] = useState<string>("active");
  const [country, setCountry] = useState<string | null>(null);
  const [ideas, setIdeas] = useState<{ person_a: string | null; person_b: string | null }[]>([]);

  useEffect(() => {
    (async () => {
      const { data, error } = await db()
        .from("people")
        .select("id,first_name,surname,gender,date_of_birth,birth_year,approx_age,city,country,height_cm,status,photo_path")
        .order("first_name");
      if (error) {
        setError("Couldn't load people. Check your signal and reload the page.");
        return;
      }
      setRows(data as Row[]);
      const { data: i } = await db().from("ideas").select("person_a,person_b");
      setIdeas(i ?? []);
      const paths = (data as Row[]).map((r) => r.photo_path).filter((p): p is string => !!p);
      if (paths.length) {
        const { data: signed } = await db().storage.from("photos").createSignedUrls(paths, 60 * 10);
        const map: Record<string, string> = {};
        signed?.forEach((s) => {
          if (s.path && s.signedUrl) map[s.path] = s.signedUrl;
        });
        setPhotos(map);
      }
    })();
  }, []);

  const shown = useMemo(() => {
    if (!rows) return [];
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (gender !== "all" && r.gender !== gender) return false;
      if (status === "active" && CLOSED.has(r.status)) return false;
      if (status !== "active" && status !== "all" && r.status !== status) return false;
      if (needle && !fullName(r).toLowerCase().includes(needle)) return false;
      if (country && r.country !== country) return false;
      return true;
    });
  }, [rows, q, gender, status, country]);

  return (
    <Shell
      title="People"
      action={
        <Link href="/person?new=1" className="btn-primary flex items-center !min-h-11 text-sm">
          + Add person
        </Link>
      }
    >
      <div className="flex flex-col gap-2">
        <input
          id="search"
          type="search"
          placeholder="Search by name"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="field"
          aria-label="Search by name"
        />
        <div className="grid grid-cols-2 gap-2 [&>*]:min-w-0">
          <select id="filter-gender" aria-label="Gender" className="field min-w-0 truncate" value={gender} onChange={(e) => setGender(e.target.value as typeof gender)}>
            <option value="all">Everyone</option>
            <option value="male">Men</option>
            <option value="female">Women</option>
          </select>
          <select id="filter-status" aria-label="Status" className="field min-w-0 truncate" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">Active only</option>
            <option value="all">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {rows && rows.length > 0 && <StatsPanel people={rows} ideas={ideas} country={country} onCountry={setCountry} />}

      {error && <p role="alert" className="rounded-lg bg-cream px-3 py-2 font-semibold text-wine">{error}</p>}
      {!rows && !error && <p className="text-cream-muted">Loading…</p>}
      {rows && rows.length === 0 && (
        <div className="card flex flex-col gap-3 p-5">
          <p className="font-display text-2xl italic text-blush">No one here yet</p>
          <p className="text-cream-muted">Add the first person you&apos;re working with. Only first name, surname and gender are needed; the rest can wait.</p>
          <Link href="/person?new=1" className="btn-primary flex items-center justify-center">Add a person</Link>
        </div>
      )}
      {rows && rows.length > 0 && shown.length === 0 && <p className="text-cream-muted">No one matches these filters.</p>}

      <ul className="flex flex-col gap-3">
        {shown.map((r) => {
          const age = ageText(r);
          const place = [r.city, r.country].filter(Boolean).join(", ");
          const photo = r.photo_path ? photos[r.photo_path] : undefined;
          return (
            <li key={r.id}>
              <Link href={`/person?id=${r.id}`} className="card flex items-center gap-3 p-3 active:opacity-80">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photo} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-cream text-lg font-bold text-wine">
                    {r.first_name[0]}
                    {r.surname[0]}
                  </span>
                )}
                <span className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="truncate text-lg font-bold">{fullName(r)}</span>
                  <span className="truncate text-sm text-cream-muted">
                    {[age, place, r.height_cm ? heightText(r.height_cm).split(" · ")[1] : ""].filter(Boolean).join(" · ") || (r.gender === "male" ? "Man" : "Woman")}
                  </span>
                  <span>
                    <StatusPill status={r.status} />
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Shell>
  );
}

export default function Page() {
  return (
    <AuthGate>
      <PeopleList />
    </AuthGate>
  );
}
