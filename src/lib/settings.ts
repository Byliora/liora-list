"use client";

import { useEffect, useState } from "react";
import { db } from "./supabase";

export type Settings = {
  people_view: "cards" | "list";
  hide_on_hold: boolean;
  default_country: string | null;
};

export const DEFAULT_SETTINGS: Settings = { people_view: "cards", hide_on_hold: true, default_country: null };

let cache: Settings | null = null;

/** Liora's settings, stored in the database (one row for her account). Falls back to defaults. */
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(cache ?? DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(cache !== null);

  useEffect(() => {
    if (cache) return;
    (async () => {
      const { data } = await db().from("settings").select("people_view,hide_on_hold,default_country").maybeSingle();
      cache = { ...DEFAULT_SETTINGS, ...(data ?? {}) };
      setSettings(cache);
      setLoaded(true);
    })();
  }, []);

  async function save(patch: Partial<Settings>): Promise<boolean> {
    const next = { ...settings, ...patch };
    cache = next;
    setSettings(next);
    const { error } = await db().from("settings").upsert(next, { onConflict: "owner_id" });
    return !error;
  }

  return { settings, loaded, save };
}
