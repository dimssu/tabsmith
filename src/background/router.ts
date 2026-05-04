import {
  NotesRepo,
  PreferencesRepo,
  RemindersRepo,
  SuggestionsRepo,
  driver,
} from "@/storage";
import { normalizeUrl } from "@/engine";
import type {
  CurrentTab,
  ExportPayload,
  GroupSummary,
  Message,
  Response,
} from "@/messaging/contracts";
import { broadcast } from "@/messaging/client";
import { applySuggestion, analyzeFullWindow, dismissSuggestion } from "./suggest";
import { cancelReminder, scheduleReminder } from "./reminders";
import { refreshBadge } from "./badge";

export function installRouter(): void {
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    handle(msg as Message)
      .then(sendResponse)
      .catch((err) => {
        console.warn("[tabsmith] message error", msg, err);
        sendResponse({ error: String(err) });
      });
    return true; // keep channel open for async response
  });
}

async function handle<M extends Message>(msg: M): Promise<Response<M>> {
  switch (msg.type) {
    case "ping":
      return { ok: true } as Response<M>;

    case "suggestions:list":
      return (await SuggestionsRepo.pending()) as Response<M>;

    case "suggestions:accept":
      return (await applySuggestion(msg.id)) as Response<M>;

    case "suggestions:dismiss":
      await dismissSuggestion(msg.id);
      return { ok: true } as Response<M>;

    case "suggestions:analyzeNow": {
      const created = await analyzeFullWindow();
      return { created } as Response<M>;
    }

    case "notes:get": {
      const note = await NotesRepo.get(msg.url);
      return (note ?? null) as Response<M>;
    }

    case "notes:upsert": {
      const opts: { pinned?: boolean } = {};
      if (msg.pinned !== undefined) opts.pinned = msg.pinned;
      const note = await NotesRepo.upsert(msg.url, msg.body, opts);
      broadcast({ type: "notes:changed", url: note.url });
      return note as Response<M>;
    }

    case "notes:list":
      return (await NotesRepo.list()) as Response<M>;

    case "notes:delete":
      await NotesRepo.delete(msg.url);
      broadcast({ type: "notes:changed", url: normalizeUrl(msg.url) });
      return { ok: true } as Response<M>;

    case "reminders:create": {
      const opts: { titleHint?: string; note?: string } = {};
      if (msg.titleHint !== undefined) opts.titleHint = msg.titleHint;
      if (msg.note !== undefined) opts.note = msg.note;
      const { id } = await scheduleReminder(msg.url, msg.fireAt, opts);
      const reminder = await RemindersRepo.get(id);
      return reminder as Response<M>;
    }

    case "reminders:list":
      return (await RemindersRepo.list()) as Response<M>;

    case "reminders:delete":
      await cancelReminder(msg.id);
      return { ok: true } as Response<M>;

    case "groups:listForCurrentWindow":
      return (await listGroupsForCurrentWindow()) as Response<M>;

    case "tabs:current":
      return (await getCurrentTab()) as Response<M>;

    case "tabs:focusOrOpen": {
      const tabId = await focusOrOpen(msg.url);
      return { tabId } as Response<M>;
    }

    case "prefs:get":
      return (await PreferencesRepo.get()) as Response<M>;

    case "prefs:update": {
      const next = await PreferencesRepo.update(msg.patch);
      broadcast({ type: "prefs:changed" });
      return next as Response<M>;
    }

    case "data:export":
      return (await exportAll()) as Response<M>;

    case "data:import":
      return (await importAll(msg.payload)) as Response<M>;

    case "data:clearAll":
      await driver.clear();
      await refreshBadge();
      broadcast({ type: "suggestions:changed" });
      broadcast({ type: "notes:changed", url: "" });
      broadcast({ type: "reminders:changed" });
      broadcast({ type: "prefs:changed" });
      return { ok: true } as Response<M>;
  }
  throw new Error(`Unknown message: ${(msg as { type: string }).type}`);
}

async function listGroupsForCurrentWindow(): Promise<GroupSummary[]> {
  const win = await chrome.windows.getCurrent();
  if (win.id === undefined) return [];
  const groups = await chrome.tabGroups.query({ windowId: win.id });
  const tabs = await chrome.tabs.query({ windowId: win.id });
  return groups.map((g) => ({
    groupId: g.id,
    title: g.title ?? "",
    color: g.color,
    memberCount: tabs.filter((t) => t.groupId === g.id).length,
  }));
}

async function getCurrentTab(): Promise<CurrentTab | null> {
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab || tab.id === undefined) return null;
  return {
    tabId: tab.id,
    url: tab.url ?? "",
    normalizedUrl: normalizeUrl(tab.url),
    title: tab.title ?? "",
    groupId: tab.groupId ?? -1,
    windowId: tab.windowId ?? -1,
    ...(tab.favIconUrl ? { favIconUrl: tab.favIconUrl } : {}),
  };
}

async function focusOrOpen(url: string): Promise<number> {
  const normalized = normalizeUrl(url);
  const tabs = await chrome.tabs.query({});
  const match = tabs.find((t) => normalizeUrl(t.url ?? "") === normalized);
  if (match?.id !== undefined) {
    if (match.windowId !== undefined) {
      await chrome.windows.update(match.windowId, { focused: true });
    }
    await chrome.tabs.update(match.id, { active: true });
    return match.id;
  }
  const opened = await chrome.tabs.create({ url, active: true });
  return opened.id ?? -1;
}

async function exportAll(): Promise<ExportPayload> {
  const [notes, reminders, prefs] = await Promise.all([
    NotesRepo.list(),
    RemindersRepo.list(),
    PreferencesRepo.get(),
  ]);
  return {
    exportedAt: Date.now(),
    schemaVersion: prefs.schemaVersion,
    notes,
    reminders,
    preferences: prefs,
  };
}

async function importAll(payload: unknown): Promise<{ imported: number }> {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("notes" in payload) ||
    !("reminders" in payload)
  ) {
    throw new Error("Invalid import payload");
  }
  const data = payload as ExportPayload;
  let imported = 0;

  for (const note of data.notes ?? []) {
    if (!note?.url) continue;
    await NotesRepo.upsert(note.url, note.body ?? "", { pinned: !!note.pinned });
    imported++;
  }
  for (const reminder of data.reminders ?? []) {
    if (!reminder?.url || !reminder?.fireAt) continue;
    if (reminder.fireAt < Date.now()) continue;
    const opts: { titleHint?: string; note?: string } = {};
    if (reminder.titleHint) opts.titleHint = reminder.titleHint;
    if (reminder.note) opts.note = reminder.note;
    await scheduleReminder(reminder.url, reminder.fireAt, opts);
    imported++;
  }
  if (data.preferences) {
    await PreferencesRepo.update(data.preferences);
  }
  return { imported };
}
