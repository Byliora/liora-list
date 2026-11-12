import { Star } from "./Star";

/** "The Liora List" is the in-app name. "By Liora" is used on everything families see. */
export function Wordmark({
  variant = "app",
  className = "",
}: {
  variant?: "app" | "by";
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-start gap-[0.08em] font-display italic font-semibold leading-none text-blush ${className}`}
      aria-label={variant === "app" ? "The Liora List" : "By Liora"}
    >
      {variant === "by" ? (
        <>
          <span className="font-medium opacity-80 mr-[0.2em]">By</span>Liora
        </>
      ) : (
        "The Liora List"
      )}
      <Star className="w-[0.4em] h-[0.4em] -mt-[0.05em] shrink-0" />
    </span>
  );
}
