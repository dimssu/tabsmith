import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { send } from "@/messaging/client";
import { debounce, favicon, shortHost } from "@/shared/utils";
import { cn } from "@/shared/utils";
import type { SearchHit, SearchHitKind } from "@/messaging/contracts";

interface Props {
  open: boolean;
  onClose: () => void;
  windowId?: number;
}

const KIND_LABEL: Record<SearchHitKind, string> = {
  tab: "Tab",
  note: "Note",
  reminder: "Reminder",
  closed: "Closed",
};

const KIND_TONE: Record<SearchHitKind, string> = {
  tab: "bg-accent-soft text-accent",
  note: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  reminder: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
  closed: "bg-surface-subtle text-ink-muted",
};

export function CommandPalette({ open, onClose, windowId }: Props) {
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  // Reset state when opening
  useEffect(() => {
    if (open) {
      setQuery("");
      setHits([]);
      setActive(0);
      // microtask so the input is mounted
      queueMicrotask(() => inputRef.current?.focus());
    }
  }, [open]);

  const runSearch = useMemo(
    () =>
      debounce(async (q: string) => {
        const trimmed = q.trim();
        if (!trimmed) {
          setHits([]);
          return;
        }
        const result = await send({
          type: "search:everything",
          query: trimmed,
          ...(windowId !== undefined ? { windowId } : {}),
          limit: 25,
        });
        setHits(result);
        setActive(0);
      }, 80),
    [windowId],
  );

  const onChange = (next: string) => {
    setQuery(next);
    runSearch(next);
  };

  const focusOrOpen = useCallback(
    async (hit: SearchHit) => {
      if (hit.kind === "closed" && hit.sessionId) {
        try {
          await chrome.sessions.restore(hit.sessionId);
          onClose();
          return;
        } catch {
          // fall through to plain navigate
        }
      }
      if (hit.kind === "tab" && hit.tabId !== undefined && hit.windowId !== undefined) {
        await chrome.windows.update(hit.windowId, { focused: true });
        await chrome.tabs.update(hit.tabId, { active: true });
        onClose();
        return;
      }
      await send({ type: "tabs:focusOrOpen", url: hit.url });
      onClose();
    },
    [onClose],
  );

  // Keyboard nav
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(hits.length - 1, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        const hit = hits[active];
        if (hit) {
          e.preventDefault();
          focusOrOpen(hit);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, hits, active, focusOrOpen, onClose]);

  // Keep active row in view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLLIElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Quarto command palette"
      className="fixed inset-0 z-50 flex items-start justify-center pt-10 px-3
        bg-black/30 backdrop-blur-[2px] animate-fade-in"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-lg border border-border bg-surface
          shadow-2xl overflow-hidden animate-slide-up"
      >
        <div className="px-3 py-3 border-b border-border flex items-center gap-2.5">
          <kbd className="font-sans text-2xs text-ink-faint border border-border rounded px-1.5 py-px">
            ⌘K
          </kbd>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Search tabs, notes, reminders, recently closed"
            aria-label="Search"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-ink-faint"
          />
          <kbd className="font-sans text-2xs text-ink-faint border border-border rounded px-1.5 py-px">
            esc
          </kbd>
        </div>

        <ul
          ref={listRef}
          role="listbox"
          aria-label="Search results"
          className="max-h-[340px] overflow-y-auto scrollbar-thin"
        >
          {hits.length === 0 ? (
            <li className="px-4 py-8 text-center text-[12px] text-ink-faint">
              {query.trim()
                ? "No matches"
                : "Type to search across tabs, notes, reminders, and recently closed."}
            </li>
          ) : (
            hits.map((hit, i) => (
              <li
                key={`${hit.kind}:${hit.url}:${i}`}
                role="option"
                aria-selected={i === active}
                data-idx={i}
                onMouseEnter={() => setActive(i)}
                onClick={() => focusOrOpen(hit)}
                className={cn(
                  "px-3 py-2 flex items-center gap-2.5 cursor-pointer",
                  "border-l-2 transition-colors",
                  i === active
                    ? "bg-surface-muted border-accent"
                    : "border-transparent hover:bg-surface-muted/60",
                )}
              >
                <img
                  src={favicon(hit.url)}
                  alt=""
                  className="w-4 h-4 rounded-sm shrink-0 bg-surface-subtle"
                  onError={(e) =>
                    ((e.currentTarget as HTMLImageElement).style.visibility = "hidden")
                  }
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[12.5px] text-ink truncate" title={hit.title}>
                    {hit.title}
                  </div>
                  <div className="text-[11px] text-ink-faint truncate flex items-center gap-1.5">
                    <span
                      className={cn(
                        "rounded px-1 py-[1px] text-[9px] uppercase tracking-[0.04em]",
                        KIND_TONE[hit.kind],
                      )}
                    >
                      {KIND_LABEL[hit.kind]}
                    </span>
                    <span className="truncate">{hit.subtitle ?? shortHost(hit.url)}</span>
                  </div>
                  {hit.excerpt ? (
                    <div className="text-[11px] text-ink-faint mt-0.5 truncate">
                      {hit.excerpt}
                    </div>
                  ) : null}
                </div>
              </li>
            ))
          )}
        </ul>

        <div className="px-3 py-1.5 border-t border-border text-[10px] text-ink-faint flex items-center justify-between">
          <span>
            <kbd className="border border-border rounded px-1">↑↓</kbd> navigate ·
            <kbd className="border border-border rounded px-1 ml-1">↵</kbd> open
          </span>
          <span>{hits.length > 0 ? `${hits.length} result${hits.length === 1 ? "" : "s"}` : ""}</span>
        </div>
      </div>
    </div>
  );
}
