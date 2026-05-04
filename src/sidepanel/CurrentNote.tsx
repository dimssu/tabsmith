import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, ExternalLink, Pin, StickyNote } from "@/components/Icon";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";
import { Pill } from "@/components/Pill";
import { send } from "@/messaging/client";
import { useAsync } from "@/hooks/useAsync";
import { shortHost, debounce, favicon, relativeTime } from "@/shared/utils";
import type { CurrentTab } from "@/messaging/contracts";
import { ReminderQuickSet } from "./ReminderQuickSet";

interface Props {
  tab: CurrentTab | null;
  loading: boolean;
  onChanged: () => void;
}

export function CurrentNote({ tab, loading, onChanged }: Props) {
  const url = tab?.url ?? "";
  const note = useAsync(
    () => (url ? send({ type: "notes:get", url }) : Promise.resolve(null)),
    [url],
  );

  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [pinned, setPinned] = useState(false);
  const initialLoadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!url) return;
    if (initialLoadedFor.current === url) return;
    if (note.loading) return;
    setDraft(note.data?.body ?? "");
    setPinned(note.data?.pinned ?? false);
    initialLoadedFor.current = url;
  }, [url, note.data, note.loading]);

  const save = useMemo(
    () =>
      debounce(async (next: string, nextPinned: boolean, target: string) => {
        if (!target) return;
        setSaving("saving");
        await send({ type: "notes:upsert", url: target, body: next, pinned: nextPinned });
        setSaving("saved");
        setTimeout(() => setSaving("idle"), 1100);
        onChanged();
      }, 350),
    [onChanged],
  );

  if (loading || !tab) {
    return (
      <EmptyState
        icon={<StickyNote width={18} height={18} />}
        title="No active tab"
        body="Switch to a tab in this window to leave a note."
      />
    );
  }

  if (!url || !url.startsWith("http")) {
    return (
      <EmptyState
        icon={<StickyNote width={18} height={18} />}
        title="Notes are for the open web"
        body="Tabsmith doesn't track notes on chrome:// or extension pages. Open a regular website to leave a note."
      />
    );
  }

  return (
    <div className="space-y-3.5">
      <div className="flex items-center gap-3 px-2">
        <img
          src={favicon(url)}
          alt=""
          className="w-5 h-5 rounded shrink-0 bg-surface-subtle"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
          }}
        />
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-medium text-ink truncate" title={tab.title}>
            {tab.title || "Untitled"}
          </div>
          <div className="text-[11px] text-ink-faint truncate flex items-center gap-1">
            {shortHost(url)}
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-ink-faint hover:text-ink"
              aria-label="Open URL"
            >
              <ExternalLink width={10} height={10} />
            </a>
          </div>
        </div>
        <button
          aria-label={pinned ? "Unpin note" : "Pin note"}
          aria-pressed={pinned}
          onClick={() => {
            setPinned((p) => {
              const next = !p;
              save(draft, next, url);
              return next;
            });
          }}
          className={`p-1.5 rounded-md transition-colors ${
            pinned ? "text-amber-500 bg-amber-500/10" : "text-ink-faint hover:text-ink"
          }`}
        >
          <Pin width={14} height={14} />
        </button>
      </div>

      <div className="relative">
        <textarea
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            save(e.target.value, pinned, url);
          }}
          placeholder="Why did I open this? Where did I stop? What's next?"
          className="w-full min-h-[160px] px-3.5 py-3 text-[13px] leading-relaxed
            bg-surface-muted/60 border border-border rounded-xl
            placeholder:text-ink-faint resize-y focus:focus-ring outline-none
            scrollbar-thin"
        />
        <div className="absolute bottom-2 right-3 flex items-center gap-2 text-[10px] text-ink-faint">
          {note.data ? (
            <span title={new Date(note.data.updatedAt).toLocaleString()}>
              edited {relativeTime(note.data.updatedAt)}
            </span>
          ) : null}
          {saving === "saving" ? <span>Saving…</span> : null}
          {saving === "saved" ? (
            <Pill tone="success" className="!text-[9px]">
              saved
            </Pill>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-surface-muted/40 p-3.5 space-y-2">
        <div className="flex items-center gap-2">
          <Bell width={13} height={13} className="text-ink-muted" />
          <h3 className="text-[12px] font-semibold text-ink">Remind me about this tab</h3>
        </div>
        <ReminderQuickSet
          url={url}
          titleHint={tab.title}
          onCreated={() => onChanged()}
        />
      </div>

      {note.data ? (
        <div className="flex justify-end">
          <Button
            variant="danger"
            size="sm"
            onClick={async () => {
              await send({ type: "notes:delete", url });
              setDraft("");
              setPinned(false);
              initialLoadedFor.current = null;
              onChanged();
            }}
          >
            Delete note
          </Button>
        </div>
      ) : null}
    </div>
  );
}
