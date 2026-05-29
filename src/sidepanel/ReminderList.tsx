import { send } from "@/messaging/client";
import { useAsync } from "@/hooks/useAsync";
import { useBroadcast } from "@/hooks/useBroadcast";
import { Card } from "@/components/Card";
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
      <div className="space-y-2 animate-pulse">
        {[0, 1].map((i) => (
          <div key={i} className="h-16 rounded-xl bg-surface-muted border border-border" />
        ))}
      </div>
    );
  }

  if (!list.data || list.data.length === 0) {
    return (
      <EmptyState
        icon={<Bell width={18} height={18} />}
        title="No reminders set"
        body="Set one from the Note tab. Reminders fire even if you've closed the tab — Tabsmith will reopen it for you."
      />
    );
  }

  const sorted = [...list.data].sort((a, b) => {
    if (a.fired !== b.fired) return a.fired ? 1 : -1;
    return a.fireAt - b.fireAt;
  });

  return (
    <ul className="space-y-2">
      {sorted.map((r) => (
        <li key={r.id}>
          <Card className="p-3 flex items-start gap-3">
            <img src={favicon(r.url)} alt="" className="w-5 h-5 rounded shrink-0 mt-0.5 bg-surface-subtle" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] text-ink font-medium truncate" title={r.titleHint ?? r.url}>
                {r.titleHint?.trim() || shortHost(r.url)}
              </div>
              <div className="text-[11px] text-ink-faint truncate flex items-center gap-1">
                {shortHost(r.url)}
                <a
                  href={r.url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-ink"
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
                <span className="text-[10px] text-ink-faint">
                  {new Date(r.fireAt).toLocaleString()}
                </span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 shrink-0">
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
              {/* Snooze is useful for both pending and already-fired reminders —
                  for fired ones it acts as a 'put it back on the schedule'. */}
              <SnoozePicker
                reminderId={r.id}
                onSnoozed={() => list.refresh()}
                label={r.fired ? "Reschedule" : "Snooze"}
              />
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
