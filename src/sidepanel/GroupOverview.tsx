import { send } from "@/messaging/client";
import { useAsync } from "@/hooks/useAsync";
import { useBroadcast } from "@/hooks/useBroadcast";
import { Card } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Layers } from "@/components/Icon";
import { cn } from "@/shared/utils";

const COLOR_DOT: Record<string, string> = {
  grey: "bg-zinc-400",
  blue: "bg-blue-500",
  red: "bg-red-500",
  yellow: "bg-yellow-400",
  green: "bg-emerald-500",
  pink: "bg-pink-500",
  purple: "bg-purple-500",
  cyan: "bg-cyan-500",
  orange: "bg-orange-500",
};

interface Props {
  onChanged: () => void;
}

export function GroupOverview({ onChanged }: Props) {
  const groups = useAsync(() => send({ type: "groups:listForCurrentWindow" }), []);
  useBroadcast((msg) => {
    if (msg.type === "suggestions:changed") onChanged();
  });

  if (groups.loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[0, 1].map((i) => (
          <div key={i} className="h-12 rounded-xl bg-surface-muted border border-border" />
        ))}
      </div>
    );
  }

  if (!groups.data || groups.data.length === 0) {
    return (
      <EmptyState
        icon={<Layers width={18} height={18} />}
        title="No groups in this window"
        body="Open Suggestions to let Tabsmith propose a starter set, or group tabs in Chrome — Tabsmith will recognize them automatically."
      />
    );
  }

  return (
    <ul className="space-y-2">
      {groups.data.map((g) => (
        <li key={g.groupId}>
          <Card className="p-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={cn(
                  "w-2.5 h-2.5 rounded-full shrink-0",
                  COLOR_DOT[g.color] ?? "bg-zinc-400",
                )}
                aria-hidden
              />
              <div className="min-w-0">
                <div className="text-[13px] font-medium text-ink truncate">
                  {g.title?.trim() || "Untitled group"}
                </div>
                <div className="text-[11px] text-ink-faint">
                  {g.memberCount} {g.memberCount === 1 ? "tab" : "tabs"}
                </div>
              </div>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
