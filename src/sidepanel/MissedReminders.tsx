import { send } from "@/messaging/client";
import { useAsync } from "@/hooks/useAsync";
import { useBroadcast } from "@/hooks/useBroadcast";
import { Button } from "@/components/Button";
import { Bell, Check, ExternalLink } from "@/components/Icon";
import { favicon, relativeTime, shortHost } from "@/shared/utils";

// Top-of-panel callout for reminders that have fired but the user hasn't
// dismissed yet. Surfaces the case where the OS notification was suppressed
// (DND, permission off) or the user stepped away when it fired.
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
      className="rounded-xl border border-red-500/30 bg-red-500/[0.06]
        animate-slide-up overflow-hidden"
    >
      <div className="px-3.5 py-2.5 flex items-center gap-2 border-b border-red-500/20">
        <Bell width={13} height={13} className="text-red-500" />
        <h3 className="text-[12px] font-semibold text-red-700 dark:text-red-400">
          {list.length === 1
            ? "1 reminder waiting for you"
            : `${list.length} reminders waiting for you`}
        </h3>
        <button
          onClick={async () => {
            await send({ type: "reminders:acknowledgeAll" });
            missed.refresh();
            onChanged();
          }}
          className="ml-auto text-[11px] text-red-700/80 dark:text-red-400/80
            hover:text-red-700 dark:hover:text-red-400 transition-colors"
        >
          Acknowledge all
        </button>
      </div>

      <ul className="divide-y divide-red-500/15">
        {list.map((r) => (
          <li key={r.id} className="px-3.5 py-2.5 flex items-start gap-2.5">
            <img
              src={favicon(r.url)}
              alt=""
              className="w-4 h-4 rounded shrink-0 mt-0.5 bg-surface-subtle"
              onError={(e) =>
                ((e.currentTarget as HTMLImageElement).style.visibility = "hidden")
              }
            />
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-medium text-ink truncate" title={r.titleHint ?? r.url}>
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
                <span className="ml-1">· fired {relativeTime(r.fireAt)}</span>
              </div>
              {r.note?.trim() ? (
                <p className="text-[11.5px] text-ink-muted mt-1 line-clamp-2">
                  {r.note}
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1 shrink-0">
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
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await send({
                    type: "reminders:snoozeFromBanner",
                    id: r.id,
                    deltaMinutes: 60,
                  });
                  missed.refresh();
                  onChanged();
                }}
              >
                Snooze 1h
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
