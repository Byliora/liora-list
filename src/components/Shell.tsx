"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { db } from "@/lib/supabase";
import { Wordmark } from "./Wordmark";
import { DemoBanner } from "./DemoBanner";

const NAV = [
  { href: "/", label: "People" },
  { href: "/ideas", label: "Ideas" },
  { href: "/more", label: "More" },
];

export function Shell({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  const path = usePathname();
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b border-wine-line bg-wine-band px-[max(16px,env(safe-area-inset-left))] pb-3 pt-[max(12px,env(safe-area-inset-top))]">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <Wordmark className="text-2xl" />
          {action}
        </div>
        <DemoBanner className="mx-auto mt-2 max-w-2xl" />
      </header>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-4 pb-28 pt-4">
        <h1 className="font-display text-3xl italic text-blush">{title}</h1>
        {children}
      </main>
      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-wine-line bg-wine-band pb-[max(8px,env(safe-area-inset-bottom))]">
        <div className="mx-auto grid max-w-2xl grid-cols-3">
          {NAV.map((n) => {
            const on = n.href === "/" ? path === "/" || path.startsWith("/person") : path.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={`flex min-h-14 items-center justify-center text-base ${on ? "font-bold text-blush" : "text-cream-muted"}`}
                aria-current={on ? "page" : undefined}
              >
                {n.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

export async function signOut() {
  await db().auth.signOut();
}
