import { useEffect, useRef, useState } from "react";
import { send } from "@/messaging/client";
import { useAsync } from "@/hooks/useAsync";
import {
  DEFAULT_SNOOZE_PRESETS,
  formatMinutes,
  minutesFromInput,
  unitForMinutes,
  type SnoozeUnit,
} from "@/shared/snooze";
import { cn } from "@/shared/utils";

interface Props {
  reminderId: string;
  onSnoozed?: () => void;
  // Visual variant — "primary" matches the side panel callout, "ghost" the
  // ReminderList row.
  variant?: "primary" | "ghost";
  className?: string;
  // Optional label override (default: "Snooze")
  label?: string;
}

// One-stop snooze affordance: button → dropdown with the user's saved
// presets plus a Custom… input. The custom value is persisted to
// preferences as lastSnoozeMinutes so it pre-fills on next use.
export function SnoozePicker({
  reminderId,
  onSnoozed,
  variant = "ghost",
  className,
  label = "Snooze",
}: Props) {
  const prefs = useAsync(() => send({ type: "prefs:get" }), []);
  const [open, setOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [value, setValue] = useState<number>(1);
  const [unit, setUnit] = useState<SnoozeUnit>("hours");
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // When the user opens Custom, pre-fill with the last value they used
  // (or 1 hour for a clean install).
  useEffect(() => {
    if (!customOpen) return;
    const last = prefs.data?.lastSnoozeMinutes;
    if (last && last > 0) {
      const u = unitForMinutes(last);
      setValue(u.value);
      setUnit(u.unit);
    } else {
      setValue(1);
      setUnit("hours");
    }
  }, [customOpen, prefs.data?.lastSnoozeMinutes]);

  // Click outside closes the menu.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setCustomOpen(false);
        setError(null);
      }
    };
    const t = setTimeout(() => document.addEventListener("mousedown", onDown), 0);
    return () => {
      clearTimeout(t);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  const presets = prefs.data?.snoozePresets ?? DEFAULT_SNOOZE_PRESETS;

  const applyPreset = async (minutes: number) => {
    await send({
      type: "reminders:snoozeFromBanner",
      id: reminderId,
      deltaMinutes: minutes,
    });
    setOpen(false);
    setCustomOpen(false);
    onSnoozed?.();
  };

  const applyCustom = async () => {
    const minutes = minutesFromInput(Number(value), unit);
    if (minutes === null) {
      setError("Enter a positive value up to 1 year.");
      return;
    }
    setError(null);
    // Snooze + remember the custom value as the user's preferred default.
    await Promise.all([
      send({
        type: "reminders:snoozeFromBanner",
        id: reminderId,
        deltaMinutes: minutes,
      }),
      send({
        type: "prefs:update",
        patch: { lastSnoozeMinutes: minutes },
      }),
    ]);
    setOpen(false);
    setCustomOpen(false);
    onSnoozed?.();
  };

  const variantCls =
    variant === "primary"
      ? "bg-accent text-white hover:bg-accent/90 px-3 py-1.5 rounded-md text-[12px] font-medium"
      : "border border-border text-ink-muted hover:text-ink hover:bg-surface-muted px-2.5 py-1 rounded-md text-[12px]";

  return (
    <div ref={rootRef} className={cn("relative inline-block", className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
          setCustomOpen(false);
          setError(null);
        }}
        className={cn("inline-flex items-center gap-1 transition-colors", variantCls)}
      >
        {label}
        <span aria-hidden className={cn("text-[9px] transition-transform", open && "rotate-180")}>▾</span>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Snooze duration"
          className="absolute right-0 top-full mt-1 z-30 min-w-[200px]
            rounded-lg border border-border bg-surface shadow-xl
            overflow-hidden animate-fade-in"
        >
          <ul className="py-1">
            {presets.map((p, i) => (
              <li key={`${p.label}-${i}`}>
                <button
                  role="menuitem"
                  onClick={() => applyPreset(p.minutes)}
                  className="w-full px-3 py-1.5 text-left text-[12.5px] text-ink
                    hover:bg-surface-muted flex items-center justify-between"
                >
                  <span>{p.label}</span>
                  <span className="text-[10px] text-ink-faint tabular-nums">
                    {formatMinutes(p.minutes)}
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="border-t border-border">
            {!customOpen ? (
              <button
                onClick={() => setCustomOpen(true)}
                className="w-full px-3 py-1.5 text-left text-[12px]
                  text-ink-muted hover:text-ink hover:bg-surface-muted"
              >
                Custom…
              </button>
            ) : (
              <div className="px-3 py-2.5 space-y-2 bg-surface-muted/40">
                <label className="block text-[10px] uppercase tracking-[0.04em] text-ink-faint">
                  Snooze for
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={0.1}
                    step={1}
                    value={value}
                    onChange={(e) => setValue(Number(e.target.value))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") applyCustom();
                    }}
                    autoFocus
                    className="w-20 px-2 py-1 rounded-md bg-surface border border-border
                      text-[12.5px] tabular-nums text-right outline-none focus:focus-ring"
                  />
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as SnoozeUnit)}
                    className="flex-1 px-2 py-1 rounded-md bg-surface border border-border
                      text-[12.5px] outline-none focus:focus-ring"
                  >
                    <option value="minutes">minutes</option>
                    <option value="hours">hours</option>
                    <option value="days">days</option>
                    <option value="weeks">weeks</option>
                  </select>
                  <button
                    onClick={applyCustom}
                    className="px-2.5 py-1 rounded-md bg-accent text-white text-[12px]
                      font-medium hover:bg-accent/90"
                  >
                    Set
                  </button>
                </div>
                {error ? (
                  <div className="text-[11px] text-red-500">{error}</div>
                ) : (
                  <div className="text-[10px] text-ink-faint">
                    Saved as your default custom snooze.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
