import { useEffect, useMemo, useRef, useState } from "react";
import { Bell, ExternalLink, Pin, StickyNote } from "@/components/Icon";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/Button";
import { Pill } from "@/components/Pill";
import { send } from "@/messaging/client";
import { useAsync } from "@/hooks/useAsync";
import { shortHost, debounce, favicon, relativeTime } from "@/shared/utils";
import { renderMarkdown } from "@/shared/markdown";
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

  const prefs = useAsync(() => send({ type: "prefs:get" }), []);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState<"idle" | "saving" | "saved">("idle");
  const [pinned, setPinned] = useState(false);
  const [readMode, setReadMode] = useState<boolean | null>(null);
  const initialLoadedFor = useRef<string | null>(null);

  // First time we have both the user's preference and a saved note body,
  // start in read mode (when configured) so the formatted view is the
  // default. Empty notes always start in edit mode.
  useEffect(() => {
    if (readMode !== null) return;
    if (prefs.data === undefined || note.loading) return;
    const wantRead = !!prefs.data.noteReadModeDefault && !!note.data?.body?.trim();
    setReadMode(wantRead);
  }, [readMode, prefs.data, note.loading, note.data]);

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
        {readMode && draft.trim() ? (
          <button
            onClick={() => setReadMode(false)}
            className="w-full min-h-[160px] px-3.5 py-3 text-sm leading-relaxed
              bg-surface-muted border border-border rounded-md text-left
              prose-tabsmith hover:border-border-strong transition-colors duration-160
              cursor-text outline-none focus-visible:focus-ring"
            aria-label="Edit note"
            // Markdown renderer escapes input + only emits known-safe tags;
            // see src/shared/markdown.ts and its tests.
            dangerouslySetInnerHTML={{ __html: renderMarkdown(draft) }}
          />
        ) : (
          <textarea
            value={draft}
            autoFocus={!draft.trim()}
            onChange={(e) => {
              setDraft(e.target.value);
              save(e.target.value, pinned, url);
            }}
            onBlur={() => {
              // Auto-flip back to read mode on blur if there's something to render.
              if (prefs.data?.noteReadModeDefault && draft.trim()) setReadMode(true);
            }}
            placeholder="Why did I open this? Where did I stop? What's next?"
            className="w-full min-h-[160px] px-3.5 py-3 text-sm leading-relaxed
              bg-surface-muted border border-border rounded-md
              placeholder:text-ink-faint resize-y focus:focus-ring outline-none
              scrollbar-thin"
          />
        )}
        <div className="absolute bottom-2 right-3 flex items-center gap-2 text-2xs text-ink-faint">
          {draft.trim() ? (
            <button
              onClick={() => setReadMode((r) => !r)}
              className="px-1.5 py-px rounded border border-border bg-surface
                hover:text-ink transition-colors duration-160"
              aria-pressed={!!readMode}
              title={readMode ? "Switch to edit mode" : "Switch to read mode"}
            >
              {readMode ? "Edit" : "Preview"}
            </button>
          ) : null}
          {note.data ? (
            <span title={new Date(note.data.updatedAt).toLocaleString()}>
              edited {relativeTime(note.data.updatedAt)}
            </span>
          ) : null}
          {saving === "saving" ? <span>Saving…</span> : null}
          {saving === "saved" ? <Pill tone="success">saved</Pill> : null}
        </div>
      </div>

      <div className="border-t border-border pt-4 space-y-2.5">
        <div className="flex items-center gap-2">
          <Bell width={13} height={13} className="text-ink-faint" />
          <h3 className="text-xs font-semibold text-ink uppercase tracking-[0.06em]">
            Remind me about this tab
          </h3>
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
