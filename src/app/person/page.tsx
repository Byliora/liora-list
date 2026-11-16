"use client";

import { Suspense } from "react";
import { AuthGate } from "@/components/AuthGate";
import { PersonForm } from "./PersonForm";

export default function Page() {
  return (
    <AuthGate>
      <Suspense fallback={<p className="p-6 text-cream-muted">Loading…</p>}>
        <PersonForm />
      </Suspense>
    </AuthGate>
  );
}
