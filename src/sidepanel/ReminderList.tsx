import { send } from "@/messaging/client";
import { useAsync } from "@/hooks/useAsync";
import { useBroadcast } from "@/hooks/useBroadcast";
import { Button } from "@/components/Button";
import { SnoozePicker } from "@/components/SnoozePicker";
import { EmptyState } from "@/components/EmptyState";
import { Bell, ExternalLink, Trash } from "@/components/Icon";
import { Pill } from "@/components/Pill";
import { favicon, relativeTime, shortHost } from "@/shared/utils";

interface Props {
  onChanged: () => void;
}

export function ReminderList({ onChanged }: Props) {
  const list = useAsync(() => send({ type: "reminders:list" }), []);

  useBroadcast((msg) => {
    if (msg.type === "reminders:changed") {
      list.refresh();
      onChanged();
    }
  });

  if (list.loading) {
    return (
      <ul className="space-y-2 animate-pulse">
        {[0, 1].map((i) => (
          <li
            key={i}
            className="h-14 rounded-md bg-surface-muted border border-border"
          />
        ))}
      </ul>
    );
  }

  if (!list.data || list.data.length === 0) {
    return (
      <EmptyState
        icon={<Bell width={20} height={20} />}
        title="No reminders set"
        body="Set one from the Note tab. Reminders fire even if you've closed the tab; Quarto will reopen it for you."
      />
    );
  }

  const sorted = [...list.data].sort((a, b) => {
    if (a.fired !== b.fired) return a.fired ? 1 : -1;
    return a.fireAt - b.fireAt;
  });

  return (
    <ul className="divide-y divide-border">
      {sorted.map((r) => (
        <li key={r.id} className="py-3 first:pt-1 flex items-start gap-3">
          <img
            src={favicon(r.url)}
            alt=""
            className="w-4 h-4 rounded-sm shrink-0 mt-0.5 bg-surface-subtle"
            onError={(e) =>
              ((e.currentTarget as HTMLImageElement).style.visibility = "hidden")
            }
          />
          <div className="flex-1 min-w-0">
            <div
              className="text-sm font-semibold text-ink truncate"
              title={r.titleHint ?? r.url}
            >
              {r.titleHint?.trim() || shortHost(r.url)}
            </div>
            <div className="text-xs text-ink-faint flex items-center gap-1 mt-0.5">
              {shortHost(r.url)}
              <a
                href={r.url}
                target="_blank"
                rel="noreferrer"
                className="hover:text-ink transition-colors"
                aria-label="Open URL"
              >
                <ExternalLink width={10} height={10} />
              </a>
            </div>
            <div className="mt-1.5 flex items-center gap-2 flex-wrap">
              {r.fired ? (
                <Pill tone="neutral">Fired</Pill>
              ) : (
                <Pill tone="accent">{relativeTime(r.fireAt)}</Pill>
              )}
              {r.recurrence && r.recurrence !== "none" ? (
                <Pill tone="success">↻ {r.recurrence}</Pill>
              ) : null}
              <span className="text-2xs text-ink-faint tabular-nums">
                {new Date(r.fireAt).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <SnoozePicker
              reminderId={r.id}
              onSnoozed={() => list.refresh()}
              label={r.fired ? "Reschedule" : "Snooze"}
            />
            <Button
              variant="ghost"
              size="sm"
              aria-label="Delete reminder"
              onClick={async () => {
                await send({ type: "reminders:delete", id: r.id });
                list.refresh();
              }}
            >
              <Trash width={13} height={13} />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
