"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Login } from "./Login";
import { Wordmark } from "./Wordmark";

export function AuthGate({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!supabase) {
    return (
      <main className="flex flex-1 flex-col justify-center gap-4 px-6 py-12">
        <Wordmark className="text-4xl" />
        <p className="max-w-[34ch] text-cream-muted">
          Almost there. This copy of the app hasn&apos;t been connected to its database yet. Add the two
          Supabase settings in Vercel, then redeploy.
        </p>
      </main>
    );
  }
  if (session === undefined) {
    return <main className="flex flex-1 items-center justify-center text-cream-muted">Loading…</main>;
  }
  if (!session) return <Login />;
  return <>{children}</>;
}
