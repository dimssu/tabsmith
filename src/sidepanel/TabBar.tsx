import { cn } from "@/shared/utils";

export type TabKey = "suggestions" | "note" | "groups" | "reminders";

interface Props {
  active: TabKey;
  onChange: (next: TabKey) => void;
  counts: Record<TabKey, number>;
}

const TABS: { key: TabKey; label: string }[] = [
  { key: "suggestions", label: "Suggestions" },
  { key: "note", label: "Note" },
  { key: "groups", label: "Groups" },
  { key: "reminders", label: "Reminders" },
];

/**
 * Underline-style tab bar. Active state is a 1.5px hairline in the accent
 * color — no pill, no fill. Reads as document tabs rather than nav chips.
 */
export function TabBar({ active, onChange, counts }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Quarto sections"
      className="flex items-end gap-5 px-4 border-b border-border bg-surface sticky top-[72px] z-10"
    >
      {TABS.map(({ key, label }) => {
        const isActive = active === key;
        const count = counts[key];
        return (
          <button
            key={key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(key)}
            className={cn(
              "relative -mb-px py-2.5 text-sm transition-colors duration-160",
              "focus-visible:focus-ring rounded-sm outline-none",
              isActive
                ? "text-ink font-semibold"
                : "text-ink-faint hover:text-ink font-medium",
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              {label}
              {count > 0 && key === "suggestions" ? (
                <span className="text-2xs tabular-nums text-ink-faint font-normal">
                  {count}
                </span>
              ) : null}
            </span>
            <span
              aria-hidden
              className={cn(
                "absolute left-0 right-0 -bottom-px h-[1.5px] rounded-full transition-opacity duration-160",
                isActive ? "bg-accent opacity-100" : "opacity-0",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}
