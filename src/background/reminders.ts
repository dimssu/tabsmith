import { RemindersRepo, NotesRepo } from "@/storage";
import { normalizeUrl } from "@/engine";
import { broadcast } from "@/messaging/client";

const ALARM_PREFIX = "reminder:";

export async function scheduleReminder(
  url: string,
  fireAt: number,
  opts?: { titleHint?: string; note?: string },
): Promise<{ id: string }> {
  const reminder = await RemindersRepo.create({
    url,
    fireAt,
    ...(opts?.titleHint ? { titleHint: opts.titleHint } : {}),
    ...(opts?.note ? { note: opts.note } : {}),
  });
  await chrome.alarms.create(`${ALARM_PREFIX}${reminder.id}`, { when: fireAt });
  broadcast({ type: "reminders:changed" });
  return { id: reminder.id };
}

export async function cancelReminder(id: string): Promise<void> {
  await chrome.alarms.clear(`${ALARM_PREFIX}${id}`);
  await RemindersRepo.delete(id);
  broadcast({ type: "reminders:changed" });
}

export async function handleAlarm(alarm: chrome.alarms.Alarm): Promise<void> {
  if (!alarm.name.startsWith(ALARM_PREFIX)) return;
  const id = alarm.name.slice(ALARM_PREFIX.length);
  const reminder = await RemindersRepo.get(id);
  if (!reminder) return;

  await RemindersRepo.markFired(id);
  broadcast({ type: "reminders:changed" });

  // Try to focus an existing tab on the same normalized URL; else open one.
  const normalized = normalizeUrl(reminder.url);
  const matchingTabs = await chrome.tabs.query({});
  const match = matchingTabs.find((t) => normalizeUrl(t.url ?? "") === normalized);

  let targetTabId: number | undefined;
  if (match?.id !== undefined) {
    targetTabId = match.id;
    if (match.windowId !== undefined) {
      await chrome.windows.update(match.windowId, { focused: true });
    }
    await chrome.tabs.update(match.id, { active: true });
  } else {
    const opened = await chrome.tabs.create({ url: reminder.url, active: false });
    if (opened.id !== undefined) targetTabId = opened.id;
  }

  // Notification — clicking opens the side panel (via action) and focuses tab
  const note = await NotesRepo.get(reminder.url);
  const message = reminder.note?.trim()
    ? reminder.note
    : note?.body?.trim()
      ? truncate(note.body, 120)
      : "Time to revisit this tab.";

  await chrome.notifications.create(`reminder:${id}`, {
    type: "basic",
    iconUrl: chrome.runtime.getURL("src/assets/icon-128.png"),
    title: reminder.titleHint?.trim() || "Tabsmith reminder",
    message,
    priority: 1,
    requireInteraction: false,
  });

  // Stash the target so the click handler can focus it
  if (targetTabId !== undefined) {
    await chrome.storage.session.set({ [`notif:reminder:${id}`]: targetTabId });
  }
}

export async function handleNotificationClick(notificationId: string): Promise<void> {
  if (!notificationId.startsWith("reminder:")) return;
  const stored = await chrome.storage.session.get(`notif:${notificationId}`);
  const tabId = stored[`notif:${notificationId}`] as number | undefined;
  if (typeof tabId === "number") {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.windowId !== undefined) {
        await chrome.windows.update(tab.windowId, { focused: true });
      }
      await chrome.tabs.update(tabId, { active: true });
    } catch {
      // tab may have been closed; fall through
    }
    await chrome.storage.session.remove(`notif:${notificationId}`);
  }
  await chrome.notifications.clear(notificationId);
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}
