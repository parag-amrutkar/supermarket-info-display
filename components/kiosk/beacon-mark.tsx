import { cn } from "cn";

/**
 * Per-part class slots, so a caller can animate the glyph's pieces
 * independently (the welcome screen draws them on in sequence). Every slot is
 * optional and defaults to nothing, so callers that only want the static mark
 * — `BootSplash` in `kiosk-shell.tsx` — are unaffected.
 */
type MarkParts = {
  box?: string;
  core?: string;
  signalInner?: string;
  signalOuter?: string;
};

/**
 * Beacon Box product mark — a broadcast glyph. Scales from font-size like the
 * tenant wordmarks, so one parent size controls it.
 *
 * The strokes carry `pathLength="1"`, which normalises the dash maths for
 * draw-on animations: `stroke-dasharray: 1` then `stroke-dashoffset: 1 -> 0`
 * traces any of them, with no measured path length involved. `pathLength` with
 * no `stroke-dasharray` is a no-op, so the static rendering is unchanged.
 */
export function BeaconMark({
  className,
  parts,
}: {
  className?: string;
  parts?: MarkParts;
}) {
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
        pathLength="1"
        className={parts?.box}
      />
      <circle cx="24" cy="33" r="2.6" fill="currentColor" className={parts?.core} />
      {/* the signal — two arcs, separate elements so they can sweep out on a
          stagger rather than as one path */}
      <path
        d="M16.5 18.5a10.6 10.6 0 0 1 15 0"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        opacity="0.55"
        pathLength="1"
        className={parts?.signalInner}
      />
      <path
        d="M11 13a18.4 18.4 0 0 1 26 0"
        stroke="currentColor"
        strokeWidth={3}
        strokeLinecap="round"
        opacity="0.55"
        pathLength="1"
        className={parts?.signalOuter}
      />
    </svg>
  );
}
