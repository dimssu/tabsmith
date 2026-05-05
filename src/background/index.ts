// Service worker entry point. MV3 terminates this aggressively, so we hold no
// in-memory state — every handler reads fresh from chrome.storage.

import { syncGroupsForWindow } from "./groupSync";
import { analyzeNewTab, analyzeFullWindow } from "./suggest";
import { handleAlarm, handleNotificationClick } from "./reminders";
import { installRouter } from "./router";
import { refreshBadge } from "./badge";
import { GroupMetaRepo, SuggestionsRepo } from "@/storage";
import { broadcast } from "@/messaging/client";

const ANALYZE_DEBOUNCE_MS = 1500;
const FULL_ANALYZE_ALARM = "tabsmith:full-analyze";

installRouter();

chrome.runtime.onInstalled.addListener(async () => {
  await chrome.sidePanel
    .setPanelBehavior({ openPanelOnActionClick: false })
    .catch(() => {});
  await refreshBadge();
  await schedulePeriodicAnalyze();
});

chrome.runtime.onStartup.addListener(async () => {
  await refreshBadge();
  await schedulePeriodicAnalyze();
});

// Allow opening the side panel from the action icon
chrome.action.onClicked.addListener(async (tab) => {
  if (tab.windowId !== undefined) {
    await chrome.sidePanel.open({ windowId: tab.windowId }).catch(() => {});
  }
});

// --- Tab lifecycle -----------------------------------------------------------

const pendingAnalyses = new Map<number, ReturnType<typeof setTimeout>>();

function scheduleAnalyzeForTab(tabId: number): void {
  const existing = pendingAnalyses.get(tabId);
  if (existing) clearTimeout(existing);
  const handle = setTimeout(async () => {
    pendingAnalyses.delete(tabId);
    try {
      const tab = await chrome.tabs.get(tabId);
      await analyzeNewTab(tab);
    } catch {
      // tab may have been closed before the debounce fired
    }
  }, ANALYZE_DEBOUNCE_MS);
  pendingAnalyses.set(tabId, handle);
}

chrome.tabs.onCreated.addListener((tab) => {
  if (tab.id !== undefined) scheduleAnalyzeForTab(tab.id);
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  // Only re-analyze when the URL settles
  if (changeInfo.url || changeInfo.status === "complete") {
    scheduleAnalyzeForTab(tabId);
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  const handle = pendingAnalyses.get(tabId);
  if (handle) {
    clearTimeout(handle);
    pendingAnalyses.delete(tabId);
  }
});

// --- Group lifecycle ---------------------------------------------------------

async function syncCurrent(): Promise<void> {
  try {
    const windows = await chrome.windows.getAll({ windowTypes: ["normal"] });
    await Promise.all(
      windows.map((w) => (w.id !== undefined ? syncGroupsForWindow(w.id) : Promise.resolve())),
    );
  } catch {
    // ignore — race with window close
  }
}

chrome.tabGroups.onCreated.addListener(syncCurrent);
chrome.tabGroups.onUpdated.addListener(syncCurrent);
chrome.tabGroups.onRemoved.addListener(syncCurrent);

// --- Periodic full-window analyze --------------------------------------------

async function schedulePeriodicAnalyze(): Promise<void> {
  await chrome.alarms.create(FULL_ANALYZE_ALARM, {
    delayInMinutes: 0.5,
    periodInMinutes: 0.5,
  });
}

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === FULL_ANALYZE_ALARM) {
    await syncCurrent();
    // Analyze every open window independently so each one gets its own
    // window-scoped suggestions, regardless of which window is focused.
    try {
      const windows = await chrome.windows.getAll({ windowTypes: ["normal"] });
      await Promise.all(
        windows
          .filter((w) => w.id !== undefined)
          .map((w) => analyzeFullWindow(w.id!)),
      );
    } catch {
      // ignore — windows may close mid-pass
    }
    return;
  }
  await handleAlarm(alarm);
});

// --- Window lifecycle --------------------------------------------------------

chrome.windows.onRemoved.addListener(async (closedWindowId) => {
  // GC any suggestions and group metadata that were anchored to the closed
  // window, otherwise stale items linger in the side panel of other windows.
  const suggestions = await SuggestionsRepo.list();
  let removed = 0;
  for (const s of suggestions) {
    if (s.windowId === closedWindowId) {
      await SuggestionsRepo.delete(s.id);
      removed++;
    }
  }
  const groups = await GroupMetaRepo.list();
  for (const g of groups) {
    if (g.windowId === closedWindowId) await GroupMetaRepo.delete(g.groupId);
  }
  if (removed > 0) {
    broadcast({ type: "suggestions:changed" });
    await refreshBadge();
  }
});

// --- Notifications -----------------------------------------------------------

chrome.notifications.onClicked.addListener(handleNotificationClick);
