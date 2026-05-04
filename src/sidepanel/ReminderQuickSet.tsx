import { useState } from "react";
import { send } from "@/messaging/client";

const PRESETS: { label: string; mins: number }[] = [
  { label: "1h", mins: 60 },
  { label: "3h", mins: 180 },
  { label: "Tomorrow", mins: 60 * 24 },
  { label: "Next week", mins: 60 * 24 * 7 },
];

interface Props {
  url: string;
  titleHint?: string;
  onCreated?: () => void;
}

export function ReminderQuickSet({ url, titleHint, onCreated }: Props) {
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState<string | null>(null);

  const create = async (mins: number, label: string) => {
    setBusy(true);
    try {
      await send({
        type: "reminders:create",
        url,
        fireAt: Date.now() + mins * 60 * 1000,
        ...(titleHint ? { titleHint } : {}),
      });
      setConfirmed(label);
      setTimeout(() => setConfirmed(null), 1600);
      onCreated?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {PRESETS.map((p) => (
        <button
          key={p.label}
          disabled={busy}
          onClick={() => create(p.mins, p.label)}
          className={`text-[12px] px-2.5 py-1.5 rounded-md border border-border
            bg-surface text-ink-muted hover:bg-surface-subtle hover:text-ink
            transition-colors disabled:opacity-50 ${
              confirmed === p.label ? "!bg-accent-soft !text-accent border-accent/30" : ""
            }`}
        >
          {confirmed === p.label ? `✓ ${p.label}` : p.label}
        </button>
      ))}
    </div>
  );
}
