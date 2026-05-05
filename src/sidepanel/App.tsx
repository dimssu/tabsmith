import { useCallback, useState } from "react";
import { send } from "@/messaging/client";
import { useAsync } from "@/hooks/useAsync";
import { useBroadcast } from "@/hooks/useBroadcast";
import { Header } from "./Header";
import { SuggestionsList } from "./SuggestionsList";
import { CurrentNote } from "./CurrentNote";
import { GroupOverview } from "./GroupOverview";
import { ReminderList } from "./ReminderList";
import { TabBar, type TabKey } from "./TabBar";

export function App() {
  const [tab, setTab] = useState<TabKey>("suggestions");
  const [refreshNonce, setRefreshNonce] = useState(0);
  const refresh = useCallback(() => setRefreshNonce((n) => n + 1), []);

  // Each side panel instance is anchored to a window. Resolve once and pass
  // it on every suggestion-related call so multi-window users get the right
  // suggestions per panel.
  const win = useAsync(() => chrome.windows.getCurrent(), []);
  const windowId = win.data?.id;

  const current = useAsync(() => send({ type: "tabs:current" }), [refreshNonce]);
  const suggestions = useAsync(
    () =>
      windowId !== undefined
        ? send({ type: "suggestions:list", windowId })
        : Promise.resolve([]),
    [refreshNonce, windowId],
  );

  useBroadcast((msg) => {
    if (msg.type === "suggestions:changed" || msg.type === "reminders:changed") {
      refresh();
    }
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

      <footer className="px-4 py-3 border-t border-border text-[11px] text-ink-faint flex items-center justify-between">
        <span>Tabsmith · 100% on-device</span>
        <button
          className="text-ink-muted hover:text-ink"
          onClick={() => chrome.runtime.openOptionsPage()}
        >
          Options
        </button>
      </footer>
    </div>
  );
}
