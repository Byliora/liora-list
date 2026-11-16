"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * One back button for every inner page: same place, same look.
 * Goes back in history when the person came from inside the app (so filters and
 * scroll position are kept), otherwise to `href`.
 */
export function BackButton({ href, label }: { href: string; label: string }) {
  const router = useRouter();
  return (
    <Link
      href={href}
      onClick={(e) => {
        const fromApp = typeof document !== "undefined" && document.referrer.startsWith(window.location.origin);
        if (fromApp && window.history.length > 1) {
          e.preventDefault();
          router.back();
        }
      }}
      className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-full border border-wine-line bg-wine-card py-1.5 pl-2.5 pr-4 text-base font-semibold text-cream active:opacity-80"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M15 5l-7 7 7 7" />
      </svg>
      {label}
    </Link>
  );
}
