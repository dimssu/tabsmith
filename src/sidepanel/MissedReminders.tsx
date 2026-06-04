import { send } from "@/messaging/client";
import { useAsync } from "@/hooks/useAsync";
import { useBroadcast } from "@/hooks/useBroadcast";
import { Button } from "@/components/Button";
import { SnoozePicker } from "@/components/SnoozePicker";
import { Bell, Check, ExternalLink } from "@/components/Icon";
import { favicon, relativeTime, shortHost } from "@/shared/utils";

/**
 * Top-of-panel callout for reminders that have fired but the user hasn't
 * dismissed yet. A small clay dot does the attention work; we don't tint
 * the whole surface red so the panel doesn't shout when there's just one.
 */
export function MissedReminders({ onChanged }: { onChanged: () => void }) {
  const missed = useAsync(async () => {
    const all = await send({ type: "reminders:list" });
    return all.filter((r) => r.fired && r.acknowledgedAt === undefined);
  }, []);

  useBroadcast((msg) => {
    if (msg.type === "reminders:changed") missed.refresh();
  });

  const list = missed.data ?? [];
  if (list.length === 0) return null;

  return (
    <section
      role="region"
      aria-label="Missed reminders"
      className="rounded-lg border border-border bg-surface-muted animate-slide-up"
    >
      <header className="px-3.5 pt-3 pb-2 flex items-center gap-2">
        <span
          aria-hidden
          className="inline-block w-1.5 h-1.5 rounded-full bg-danger"
        />
        <h3 className="text-sm font-semibold text-ink">
          {list.length === 1
            ? "Reminder waiting"
            : `${list.length} reminders waiting`}
        </h3>
        <Bell width={12} height={12} className="text-ink-faint" />
        <button
          onClick={async () => {
            await send({ type: "reminders:acknowledgeAll" });
            missed.refresh();
            onChanged();
          }}
          className="ml-auto text-xs text-ink-muted hover:text-ink transition-colors"
        >
          Acknowledge all
        </button>
      </header>

      <ul className="divide-y divide-border">
        {list.map((r) => (
          <li key={r.id} className="px-3.5 py-3 flex items-start gap-3">
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
                <span className="ml-1">· fired {relativeTime(r.fireAt)}</span>
              </div>
              {r.note?.trim() ? (
                <p className="text-xs text-ink-muted mt-1.5 line-clamp-2 leading-relaxed">
                  {r.note}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5 shrink-0 items-end">
              <Button
                variant="primary"
                size="sm"
                leadingIcon={<Check width={11} height={11} />}
                onClick={async () => {
                  await send({ type: "reminders:acknowledge", id: r.id });
                  missed.refresh();
                  onChanged();
                }}
              >
                Got it
              </Button>
              <SnoozePicker
                reminderId={r.id}
                onSnoozed={() => {
                  missed.refresh();
                  onChanged();
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
