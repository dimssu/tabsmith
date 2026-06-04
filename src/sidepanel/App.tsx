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
import { MissedReminders } from "./MissedReminders";
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

  const [toast, setToast] = useState<{ tone: "success" | "neutral"; text: string } | null>(null);

  const onAnalyze = useCallback(async () => {
    if (windowId === undefined) return;
    setToast({ tone: "neutral", text: "Analyzing tabs…" });
    const result = await send({ type: "suggestions:analyzeNow", windowId });
    if (result.created > 0) {
      setToast({
        tone: "success",
        text: `Found ${result.created} new ${result.created === 1 ? "idea" : "ideas"}.`,
      });
    } else {
      // 0 is by design when every tab is already grouped — say so explicitly
      // rather than leaving the user wondering whether the button worked.
      setToast({
        tone: "neutral",
        text:
          "No new suggestions — every open tab is already in a group. Open more tabs or ungroup some to get fresh ideas.",
      });
    }
    refresh();
    // Auto-dismiss the confirmation; leave the longer explanation up a bit
    // longer so users have time to read it.
    setTimeout(
      () => setToast(null),
      result.created > 0 ? 2200 : 5000,
    );
  }, [refresh, windowId]);

  return (
    <div className="min-h-screen flex flex-col bg-surface relative">
      <Header
        currentTabTitle={current.data?.title ?? ""}
        onAnalyze={onAnalyze}
        suggestionCount={suggestions.data?.length ?? 0}
      />

      {toast ? (
        <div
          role="status"
          aria-live="polite"
          className={`mx-4 mt-3 px-3 py-2 rounded-md text-sm leading-snug
            border animate-slide-up ${
              toast.tone === "success"
                ? "bg-success-soft border-success/30 text-success"
                : "bg-surface-muted border-border text-ink-muted"
            }`}
        >
          {toast.text}
        </div>
      ) : null}

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
        <MissedReminders onChanged={refresh} />

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

      <footer className="px-4 py-2.5 border-t border-border text-2xs text-ink-faint flex items-center justify-between gap-3 bg-surface">
        <span className="truncate inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block w-1 h-1 rounded-full bg-success"
            title="100% on-device"
          />
          on-device
          {windowId !== undefined ? (
            <span className="text-ink-faint/60 tabular-nums">· w{windowId}</span>
          ) : null}
        </span>
        <div className="flex items-center gap-3 shrink-0">
          <button
            className="text-ink-muted hover:text-ink inline-flex items-center gap-1 transition-colors"
            onClick={() => setPaletteOpen(true)}
            title="Open command palette"
          >
            <kbd className="font-sans border border-border rounded px-1 py-px text-2xs text-ink-faint">⌘K</kbd>
            Search
          </button>
          <button
            className="text-ink-muted hover:text-ink transition-colors"
            onClick={() => chrome.runtime.openOptionsPage()}
            title="Open the full guide, preferences, and data tools"
          >
            Guide
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
