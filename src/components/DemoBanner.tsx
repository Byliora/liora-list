/** Shown only when NEXT_PUBLIC_DEMO=1, so the test copy can't be mistaken for the real one. */
export function DemoBanner() {
  if (process.env.NEXT_PUBLIC_DEMO !== "1") return null;
  return (
    <div className="bg-cream px-4 py-1.5 text-center text-sm font-bold text-wine pt-[max(6px,env(safe-area-inset-top))]">
      Demo copy · fake people only
    </div>
  );
}
