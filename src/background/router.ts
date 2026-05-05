import {
  NotesRepo,
  PreferencesRepo,
  RemindersRepo,
  SuggestionsRepo,
  driver,
} from "@/storage";
import { normalizeUrl, rankAll } from "@/engine";
import type {
  CurrentTab,
  ExportPayload,
  GroupSummary,
  Message,
  Response,
  SearchHit,
} from "@/messaging/contracts";
import { broadcast } from "@/messaging/client";
import { applySuggestion, analyzeFullWindow, dismissSuggestion } from "./suggest";
import { cancelReminder, scheduleReminder } from "./reminders";
import { refreshBadge } from "./badge";
import type { Suggestion } from "@/types";

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

    case "suggestions:list": {
      const targetWindowId = await resolveWindowId(msg.windowId);
      const live = await listLiveSuggestionsFor(targetWindowId);
      return live as Response<M>;
    }

    case "suggestions:accept":
      return (await applySuggestion(msg.id)) as Response<M>;

    case "suggestions:dismiss":
      await dismissSuggestion(msg.id);
      return { ok: true } as Response<M>;

    case "suggestions:analyzeNow": {
      const targetWindowId = await resolveWindowId(msg.windowId);
      const created = await analyzeFullWindow(targetWindowId);
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
      const opts: Parameters<typeof scheduleReminder>[2] = {};
      if (msg.titleHint !== undefined) opts.titleHint = msg.titleHint;
      if (msg.note !== undefined) opts.note = msg.note;
      if (msg.recurrence !== undefined) opts.recurrence = msg.recurrence;
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

    case "groups:rename":
      await chrome.tabGroups.update(msg.groupId, { title: msg.title });
      return { ok: true } as Response<M>;

    case "groups:recolor":
      await chrome.tabGroups.update(msg.groupId, {
        color: msg.color as chrome.tabGroups.ColorEnum,
      });
      return { ok: true } as Response<M>;

    case "search:everything":
      return (await searchEverything(msg.query, msg.windowId, msg.limit)) as Response<M>;

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

// List pending suggestions for a window, GC'ing any that have gone stale.
//
// IMPORTANT: only validate tabIds/groupId when the suggestion claims to be
// for the target window — checking another window's tabs against this
// window's live-tab set would (correctly) report them as missing and cause
// us to wrongly delete valid cross-window suggestions.
async function listLiveSuggestionsFor(
  targetWindowId: number | undefined,
): Promise<Suggestion[]> {
  const all = await SuggestionsRepo.pending();
  if (targetWindowId === undefined) return [];

  const tabsInWindow = await chrome.tabs.query({ windowId: targetWindowId });
  const liveTabIds = new Set(
    tabsInWindow
      .map((t) => t.id)
      .filter((v): v is number => typeof v === "number"),
  );
  const liveGroupIds = new Set(
    tabsInWindow
      .map((t) => t.groupId)
      .filter((v): v is number => typeof v === "number" && v !== -1),
  );

  const live: Suggestion[] = [];
  let removed = 0;

  for (const s of all) {
    // 1. Pre-fix records (no windowId) are always stale — delete on sight.
    if (s.windowId === undefined) {
      await SuggestionsRepo.delete(s.id);
      removed++;
      continue;
    }

    // 2. Records tagged with a different window: not relevant here, but
    //    don't touch them — another window's panel may still need them.
    if (s.windowId !== targetWindowId) continue;

    // 3. Records claiming to be for this window — validate referenced tabs.
    const tabsMissing =
      s.tabIds.length === 0 || !s.tabIds.every((id) => liveTabIds.has(id));
    const groupMissing =
      s.kind === "assign" &&
      (s.targetGroupId === undefined || !liveGroupIds.has(s.targetGroupId));

    if (tabsMissing || groupMissing) {
      await SuggestionsRepo.delete(s.id);
      removed++;
      continue;
    }

    live.push(s);
  }

  if (removed > 0) await refreshBadge();
  return live;
}

async function resolveWindowId(hint: number | undefined): Promise<number | undefined> {
  if (hint !== undefined) return hint;
  try {
    const win = await chrome.windows.getLastFocused({ windowTypes: ["normal"] });
    return win.id;
  } catch {
    return undefined;
  }
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

async function searchEverything(
  query: string,
  windowId?: number,
  limit = 30,
): Promise<SearchHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const [tabs, notes, reminders, recentlyClosed] = await Promise.all([
    chrome.tabs.query({}),
    NotesRepo.list(),
    RemindersRepo.list(),
    chrome.sessions
      ? chrome.sessions.getRecentlyClosed({ maxResults: 25 }).catch(() => [])
      : Promise.resolve([]),
  ]);

  const hits: SearchHit[] = [];

  // Tabs — current window first, then others. We rank inside each bucket.
  const ownedTabs = windowId !== undefined
    ? tabs.filter((t) => t.windowId === windowId)
    : tabs;
  const otherTabs = windowId !== undefined
    ? tabs.filter((t) => t.windowId !== windowId)
    : [];

  for (const bucket of [ownedTabs, otherTabs]) {
    const ranked = rankAll(
      trimmed,
      bucket.map((t) => ({
        title: t.title ?? "",
        url: t.url ?? "",
      })),
      limit,
    );
    for (const r of ranked) {
      const original = bucket.find(
        (t) => (t.title ?? "") === r.item.title && (t.url ?? "") === r.item.url,
      );
      if (!original?.url) continue;
      hits.push({
        kind: "tab",
        title: r.item.title || original.url,
        url: original.url,
        ...(original.id !== undefined ? { tabId: original.id } : {}),
        ...(original.windowId !== undefined ? { windowId: original.windowId } : {}),
        score: r.score,
        subtitle:
          original.windowId === windowId
            ? new URL(original.url).hostname
            : `Other window · ${new URL(original.url).hostname}`,
      });
    }
  }

  // Notes — searched against title (last URL segment) + body.
  const noteScored = rankAll(
    trimmed,
    notes.map((n) => ({
      title: lastSegment(n.url) || n.url,
      url: n.url,
      body: n.body,
    })),
    limit,
  );
  for (const r of noteScored) {
    const original = notes.find((n) => n.url === r.item.url);
    if (!original) continue;
    hits.push({
      kind: "note",
      title: r.item.title,
      url: original.url,
      score: r.score * 0.95, // gentle bias toward live tabs
      excerpt: original.body.slice(0, 160),
      subtitle: "Note",
    });
  }

  // Reminders.
  const reminderScored = rankAll(
    trimmed,
    reminders.map((r) => ({
      title: r.titleHint ?? "Reminder",
      url: r.url,
      body: r.note ?? "",
    })),
    limit,
  );
  for (const r of reminderScored) {
    const original = reminders.find(
      (rem) => rem.url === r.item.url && (rem.titleHint ?? "Reminder") === r.item.title,
    );
    if (!original) continue;
    hits.push({
      kind: "reminder",
      title: r.item.title,
      url: original.url,
      score: r.score * 0.9,
      subtitle: original.fired
        ? "Reminder · fired"
        : `Reminder · ${new Date(original.fireAt).toLocaleString()}`,
    });
  }

  // Recently closed tabs (chrome.sessions). May be empty if permission missing.
  const closedTabs: { title: string; url: string; sessionId?: string }[] = [];
  for (const session of recentlyClosed ?? []) {
    if (session.tab && session.tab.url) {
      closedTabs.push({
        title: session.tab.title ?? session.tab.url,
        url: session.tab.url,
        ...(session.tab.sessionId ? { sessionId: session.tab.sessionId } : {}),
      });
    } else if (session.window?.tabs) {
      for (const t of session.window.tabs) {
        if (t.url) {
          closedTabs.push({
            title: t.title ?? t.url,
            url: t.url,
            ...(t.sessionId ? { sessionId: t.sessionId } : {}),
          });
        }
      }
    }
  }
  const closedScored = rankAll(trimmed, closedTabs, limit);
  for (const r of closedScored) {
    const original = closedTabs.find(
      (c) => c.title === r.item.title && c.url === r.item.url,
    );
    if (!original) continue;
    hits.push({
      kind: "closed",
      title: r.item.title,
      url: original.url,
      ...(original.sessionId ? { sessionId: original.sessionId } : {}),
      score: r.score * 0.7,
      subtitle: "Recently closed",
    });
  }

  // Final blended ranking + dedupe by url+kind so the same page doesn't
  // appear as both a Tab and a Note.
  hits.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const out: SearchHit[] = [];
  for (const h of hits) {
    const key = `${h.kind}:${h.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(h);
    if (out.length >= limit) break;
  }
  return out;
}

function lastSegment(url: string): string {
  try {
    const u = new URL(url);
    const segs = u.pathname.split("/").filter(Boolean);
    return segs[segs.length - 1] ?? u.hostname;
  } catch {
    return url;
  }
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
    const opts: Parameters<typeof scheduleReminder>[2] = {};
    if (reminder.titleHint) opts.titleHint = reminder.titleHint;
    if (reminder.note) opts.note = reminder.note;
    if (reminder.recurrence && reminder.recurrence !== "none") {
      opts.recurrence = reminder.recurrence;
    }
    await scheduleReminder(reminder.url, reminder.fireAt, opts);
    imported++;
  }
  if (data.preferences) {
    await PreferencesRepo.update(data.preferences);
  }
  return { imported };
}
