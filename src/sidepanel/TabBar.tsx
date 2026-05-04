import { cn } from "@/shared/utils";
import { Bell, Layers, Sparkles, StickyNote } from "@/components/Icon";

export type TabKey = "suggestions" | "note" | "groups" | "reminders";

interface Props {
  active: TabKey;
  onChange: (next: TabKey) => void;
  counts: Record<TabKey, number>;
}

const TABS: { key: TabKey; label: string; Icon: typeof Sparkles }[] = [
  { key: "suggestions", label: "Suggestions", Icon: Sparkles },
  { key: "note", label: "Note", Icon: StickyNote },
  { key: "groups", label: "Groups", Icon: Layers },
  { key: "reminders", label: "Reminders", Icon: Bell },
];

export function TabBar({ active, onChange, counts }: Props) {
  return (
    <div
      role="tablist"
      aria-label="Tabsmith sections"
      className="flex items-center gap-1 px-3 pt-2 pb-2 border-b border-border bg-surface sticky top-[68px] z-10"
    >
      {TABS.map(({ key, label, Icon }) => {
        const isActive = active === key;
        const count = counts[key];
        return (
          <button
            key={key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md",
              "text-[12px] font-medium transition-colors",
              isActive
                ? "bg-accent-soft text-accent"
                : "text-ink-muted hover:bg-surface-muted hover:text-ink",
            )}
          >
            <Icon width={13} height={13} />
            <span>{label}</span>
            {count > 0 && key === "suggestions" ? (
              <span
                className={cn(
                  "ml-1 px-1.5 rounded-full text-[10px] font-semibold tabular-nums",
                  isActive ? "bg-accent text-white" : "bg-surface-subtle text-ink-muted",
                )}
              >
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
