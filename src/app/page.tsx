import { Wordmark } from "@/components/Wordmark";

// Placeholder start screen until login is built later in phase 1.
export default function Home() {
  return (
    <main className="relative flex flex-1 flex-col justify-center gap-4 overflow-hidden px-[max(24px,env(safe-area-inset-left))] py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-28 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(246,201,207,.22)_0%,transparent_70%)]"
      />
      <Wordmark className="text-4xl" />
      <p className="font-display italic text-3xl leading-tight text-blush">
        Bringing two lights together.
      </p>
      <p className="max-w-[30ch] text-cream-muted">
        The Liora List is being built. Sign-in arrives later in phase 1.
      </p>
    </main>
  );
}
