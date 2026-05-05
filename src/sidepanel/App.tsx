import { useCallback, useEffect, useState } from "react";
import { send } from "@/messaging/client";
import { useAsync } from "@/hooks/useAsync";
import { useBroadcast } from "@/hooks/useBroadcast";
import { CommandPalette } from "@/components/CommandPalette";
import { useTheme } from "@/hooks/useTheme";
import { Header } from "./Header";
import { SuggestionsList } from "./SuggestionsList";
import { CurrentNote } from "./CurrentNote";
import { GroupOverview } from "./GroupOverview";
import { ReminderList } from "./ReminderList";
import { TabBar, type TabKey } from "./TabBar";

export function App() {
  useTheme();
  const [tab, setTab] = useState<TabKey>("suggestions");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const refresh = useCallback(() => setRefreshNonce((n) => n + 1), []);

  // Each side panel instance is anchored to a window. Prefer the URL-stamped
  // windowId (set by the background when the panel is opened) — it's
  // unambiguous. chrome.windows.getCurrent() from a side panel can return the
  // last-focused window rather than the host, so we only use it as fallback.
  const win = useAsync(async () => {
    const params = new URLSearchParams(window.location.search);
    const stamped = params.get("windowId");
    if (stamped) {
      const n = Number(stamped);
      if (Number.isFinite(n)) return { id: n } as chrome.windows.Window;
    }
    return chrome.windows.getCurrent();
  }, []);
  const windowId = win.data?.id;

  const current = useAsync(() => send({ type: "tabs:current" }), [refreshNonce]);
  const suggestions = useAsync(
    () =>
      windowId !== undefined
        ? send({ type: "suggestions:list", windowId })
        : Promise.resolve([]),
    [refreshNonce, windowId],
  );

  // Command palette state
  const [paletteOpen, setPaletteOpen] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("palette") === "1";
  });

  // Local keyboard shortcut (Cmd/Ctrl+K) — also responds to the
  // chrome.commands trigger via the palette:open broadcast.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useBroadcast((msg) => {
    if (msg.type === "suggestions:changed" || msg.type === "reminders:changed") {
      refresh();
    }
    if (msg.type === "palette:open") setPaletteOpen(true);
  });

  const onAnalyze = useCallback(async () => {
    if (windowId === undefined) return;
    await send({ type: "suggestions:analyzeNow", windowId });
    refresh();
  }, [refresh, windowId]);

  return (
    <div className="min-h-screen flex flex-col bg-surface">
      <Header
        currentTabTitle={current.data?.title ?? ""}
        onAnalyze={onAnalyze}
        suggestionCount={suggestions.data?.length ?? 0}
      />

      <TabBar
        active={tab}
        onChange={setTab}
        counts={{
          suggestions: suggestions.data?.length ?? 0,
          note: 0,
          groups: 0,
          reminders: 0,
        }}
      />

      <main className="flex-1 px-4 pb-6 pt-3 space-y-4 scrollbar-thin overflow-y-auto">
        {tab === "suggestions" ? (
          <SuggestionsList
            data={suggestions.data ?? []}
            loading={suggestions.loading}
            onRefresh={refresh}
            onAnalyze={onAnalyze}
          />
        ) : null}

        {tab === "note" ? (
          <CurrentNote
            tab={current.data ?? null}
            loading={current.loading}
            onChanged={refresh}
          />
        ) : null}

        {tab === "groups" ? <GroupOverview onChanged={refresh} /> : null}

        {tab === "reminders" ? (
          <ReminderList onChanged={refresh} />
        ) : null}
      </main>

      <footer className="px-4 py-3 border-t border-border text-[11px] text-ink-faint flex items-center justify-between gap-2">
        <span className="truncate">
          Tabsmith · 100% on-device
          {windowId !== undefined ? (
            <span className="ml-2 opacity-60">· window #{windowId}</span>
          ) : null}
        </span>
        <div className="flex items-center gap-3 shrink-0">
          <button
            className="text-ink-muted hover:text-ink inline-flex items-center gap-1"
            onClick={() => setPaletteOpen(true)}
            title="Open command palette"
          >
            <kbd className="border border-border rounded px-1">⌘K</kbd>
            Search
          </button>
          <button
            className="text-ink-muted hover:text-ink"
            onClick={() => chrome.runtime.openOptionsPage()}
          >
            Options
          </button>
        </div>
      </footer>

      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        {...(windowId !== undefined ? { windowId } : {})}
      />
    </div>
  );
}
