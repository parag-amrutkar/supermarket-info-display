/**
 * The 9:16 kiosk panel, for screens reached by URL rather than through
 * `KioskShell`.
 *
 * The sizing here is deliberately identical to the panel in `kiosk-shell.tsx`,
 * including why it is written as two `min()`s instead of `aspect-[9/16]` — see
 * the comment there. If that math changes, change it in both places, or extract
 * it once someone needs a third caller.
 *
 * Server component: nothing in the frame is interactive.
 */
export function PanelFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-dvh w-full place-items-center overflow-hidden bg-neutral-300">
      <div className="h-[min(100dvh,calc(100vw*16/9))] w-[min(100vw,calc(100dvh*9/16))] overflow-hidden bg-background text-foreground">
        {children}
      </div>
    </div>
  );
}
