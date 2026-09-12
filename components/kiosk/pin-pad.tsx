"use client";

import * as React from "react";
import { ArrowLeft, Delete } from "lucide-react";
import { cn } from "cn";

import { TenantWordmark } from "@/components/kiosk/tenant-wordmark";
import { type DemoSession, verifyPin } from "@/lib/demo-auth";
import { PIN_LENGTH, type Tenant } from "@/lib/tenants";

type Status = "idle" | "checking" | "error";

/** One keypad key. Deliberately not `ui/button` — its compact `cva` base is
 *  built for a laptop and overriding every size token costs more than this. */
function PinKey({
  className,
  children,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "grid aspect-square place-items-center rounded-2xl bg-card font-sans text-[7cqw] font-medium shadow-sm ring-1 ring-foreground/15 transition-colors outline-none",
        "hover:bg-muted focus-visible:ring-4 focus-visible:ring-brand/70",
        "active:translate-y-px active:bg-brand active:text-brand-foreground",
        "disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function PinPad({
  tenant,
  onSuccess,
  onCancel,
}: {
  tenant: Tenant;
  onSuccess: (session: DemoSession) => void;
  onCancel: () => void;
}) {
  const [digits, setDigits] = React.useState("");
  // Mirrors `digits` so the handlers below read the committed value rather
  // than a stale closure. Two taps landing in one React batch would other-
  // wise both compute from the same starting string and lose a digit.
  const digitsRef = React.useRef("");
  const [status, setStatus] = React.useState<Status>("idle");
  // Bumped on every failure so the readout remounts. React will not restart
  // a CSS animation just because the same class is re-added, so without this
  // a second wrong PIN in a row shakes nothing.
  const [errorCount, setErrorCount] = React.useState(0);
  const resetTimer = React.useRef<number | undefined>(undefined);

  React.useEffect(() => {
    return () => window.clearTimeout(resetTimer.current);
  }, []);

  const submit = React.useCallback(
    async (pin: string) => {
      setStatus("checking");
      const result = await verifyPin(tenant.id, pin);
      if (result.ok) {
        onSuccess(result.session);
        return;
      }
      setStatus("error");
      setErrorCount((n) => n + 1);
      resetTimer.current = window.setTimeout(() => {
        digitsRef.current = "";
        setDigits("");
        setStatus("idle");
      }, 850);
    },
    [tenant.id, onSuccess],
  );

  // Side effects stay out of the state updater so StrictMode's double-invoke
  // cannot submit the same PIN twice.
  const press = (digit: string) => {
    if (status !== "idle" || digitsRef.current.length >= PIN_LENGTH) return;
    const next = digitsRef.current + digit;
    digitsRef.current = next;
    setDigits(next);
    if (next.length === PIN_LENGTH) void submit(next);
  };

  const backspace = () => {
    if (status !== "idle") return;
    digitsRef.current = digitsRef.current.slice(0, -1);
    setDigits(digitsRef.current);
  };

  const clear = () => {
    if (status !== "idle") return;
    digitsRef.current = "";
    setDigits("");
  };

  // The panel is a touchscreen, but keep it fully operable from a keyboard —
  // it is how this gets tested, and how an attached USB keypad would behave.
  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key >= "0" && event.key <= "9") {
        event.preventDefault();
        press(event.key);
      } else if (event.key === "Backspace") {
        event.preventDefault();
        backspace();
      } else if (event.key === "Escape") {
        event.preventDefault();
        if (digits.length > 0) clear();
        else onCancel();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  const busy = status !== "idle";

  return (
    <div className="@container flex h-full w-full flex-col justify-between gap-[4cqw] px-[6cqw] py-[7cqw]">
      <header className="flex items-center gap-[3cqw]">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Back to machine selection"
          className="grid size-[9cqw] shrink-0 place-items-center rounded-xl ring-1 ring-foreground/15 transition-colors outline-none hover:bg-muted focus-visible:ring-4 focus-visible:ring-brand/70"
        >
          <ArrowLeft className="size-[4.5cqw]" />
        </button>
        <span className="grid h-[11cqw] flex-1 place-items-center overflow-hidden rounded-xl bg-brand text-brand-foreground">
          <TenantWordmark tenant={tenant} className="text-[2.6cqw]" />
        </span>
      </header>

      <div className="flex flex-col items-center gap-[3cqw] text-center">
        <div className="space-y-[1cqw]">
          <h1 className="text-[4.6cqw] leading-tight font-semibold">
            Enter staff PIN
          </h1>
          <p className="text-[2.2cqw] text-muted-foreground">
            {tenant.name} · {tenant.storeNumber}
          </p>
        </div>

        {/* Readout. Plain divs, not ui/input-otp — that wraps a real focusable
            text input with its own caret model, which fights a custom keypad. */}
        <div
          key={errorCount}
          className={cn(
            "flex items-center gap-[3.5cqw]",
            status === "error" && "motion-safe:animate-shake",
          )}
        >
          {Array.from({ length: PIN_LENGTH }, (_, i) => (
            <span
              key={i}
              className={cn(
                "size-[4cqw] rounded-full transition-colors",
                status === "error"
                  ? "bg-destructive"
                  : i < digits.length
                    ? "bg-brand"
                    : "bg-foreground/15",
              )}
            />
          ))}
        </div>

        {/* Digit count only — never the digits themselves. */}
        <p aria-live="polite" className="sr-only">
          {status === "error"
            ? "Incorrect PIN, cleared"
            : `${digits.length} of ${PIN_LENGTH} digits entered`}
        </p>

        <p
          className={cn(
            "text-[2.1cqw] transition-opacity",
            status === "error"
              ? "text-destructive opacity-100"
              : "opacity-0",
          )}
        >
          Incorrect PIN — try again
        </p>
      </div>

      <div className="grid grid-cols-3 gap-[3cqw]">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
          <PinKey key={digit} disabled={busy} onClick={() => press(digit)}>
            {digit}
          </PinKey>
        ))}
        <PinKey
          disabled={busy || digits.length === 0}
          onClick={clear}
          className="text-[2.6cqw] tracking-[0.12em] uppercase"
        >
          Clear
        </PinKey>
        <PinKey disabled={busy} onClick={() => press("0")}>
          0
        </PinKey>
        <PinKey
          disabled={busy || digits.length === 0}
          onClick={backspace}
          aria-label="Delete last digit"
        >
          <Delete className="size-[6cqw]" />
        </PinKey>
      </div>

      <footer className="text-center text-[1.9cqw] text-muted-foreground">
        {status === "checking" ? (
          <span className="text-brand">Checking&hellip;</span>
        ) : (
          <>
            Demo build — enter{" "}
            <span className="text-foreground">any {PIN_LENGTH} digits</span>
          </>
        )}
      </footer>
    </div>
  );
}
