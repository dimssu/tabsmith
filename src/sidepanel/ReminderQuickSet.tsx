import { useState } from "react";
import { send } from "@/messaging/client";
import type { RecurrenceKind } from "@/types";

const PRESETS: { label: string; mins: number }[] = [
  { label: "1h", mins: 60 },
  { label: "3h", mins: 180 },
  { label: "Tomorrow", mins: 60 * 24 },
  { label: "Next week", mins: 60 * 24 * 7 },
];

const RECURRENCE_OPTIONS: { value: RecurrenceKind; label: string }[] = [
  { value: "none", label: "Once" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

interface Props {
  url: string;
  titleHint?: string;
  onCreated?: () => void;
}

export function ReminderQuickSet({ url, titleHint, onCreated }: Props) {
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState<string | null>(null);
  const [recurrence, setRecurrence] = useState<RecurrenceKind>("none");

  const create = async (mins: number, label: string) => {
    setBusy(true);
    try {
      await send({
        type: "reminders:create",
        url,
        fireAt: Date.now() + mins * 60 * 1000,
        ...(titleHint ? { titleHint } : {}),
        ...(recurrence !== "none" ? { recurrence } : {}),
      });
      setConfirmed(label);
      setTimeout(() => setConfirmed(null), 1600);
      onCreated?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            disabled={busy}
            onClick={() => create(p.mins, p.label)}
            className={`text-[12px] px-2.5 py-1.5 rounded-md border border-border
              bg-surface text-ink-muted hover:bg-surface-subtle hover:text-ink
              transition-colors disabled:opacity-50 ${
                confirmed === p.label
                  ? "!bg-accent-soft !text-accent border-accent/30"
                  : ""
              }`}
          >
            {confirmed === p.label ? `✓ ${p.label}` : p.label}
          </button>
        ))}
      </div>

      <div
        role="radiogroup"
        aria-label="Repeat"
        className="flex items-center gap-1.5 flex-wrap"
      >
        <span className="text-[10px] uppercase tracking-[0.05em] text-ink-faint mr-1">
          Repeat
        </span>
        {RECURRENCE_OPTIONS.map((opt) => {
          const active = recurrence === opt.value;
          return (
            <button
              key={opt.value}
              role="radio"
              aria-checked={active}
              onClick={() => setRecurrence(opt.value)}
              className={`text-[11px] px-2 py-[3px] rounded-full border transition-colors ${
                active
                  ? "bg-accent-soft border-accent/40 text-accent"
                  : "bg-transparent border-border text-ink-muted hover:text-ink"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
