import { cn } from "cn";

/**
 * Beacon Box product mark — a broadcast glyph. Scales from font-size like the
 * tenant wordmarks, so one parent size controls it.
 */
export function BeaconMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      {/* the box */}
      <rect
        x="13"
        y="25"
        width="22"
        height="16"
        rx="3.5"
        stroke="currentColor"
        strokeWidth={3}
      />
      <circle cx="24" cy="33" r="2.6" fill="currentColor" />
      {/* the signal */}
      <path
        d="M16.5 18.5a10.6 10.6 0 0 1 15 0M11 13a18.4 18.4 0 0 1 26 0"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        opacity="0.55"
      />
    </svg>
  );
}
