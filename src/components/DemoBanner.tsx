/** Shown only when NEXT_PUBLIC_DEMO=1, so the test copy can't be mistaken for the real one. */
export function DemoBanner({ className = "" }: { className?: string }) {
  if (process.env.NEXT_PUBLIC_DEMO !== "1") return null;
  return (
    <div className={`rounded-full bg-cream px-3 py-1 text-center text-xs font-bold text-wine ${className}`}>
      Demo copy · fake people only
    </div>
  );
}
