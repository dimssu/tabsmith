import { RemindersRepo, NotesRepo } from "@/storage";
import { normalizeUrl } from "@/engine";
import { broadcast } from "@/messaging/client";
import type { RecurrenceKind } from "@/types";

const ALARM_PREFIX = "reminder:";

// Notification button indices. Order matters — Chrome calls
// onButtonClicked with the index from this list.
const SNOOZE_BUTTONS = [
  { title: "Snooze 1h", deltaMinutes: 60 },
  { title: "Tomorrow", deltaMinutes: 60 * 24 },
] as const;

export async function scheduleReminder(
  url: string,
  fireAt: number,
  opts?: { titleHint?: string; note?: string; recurrence?: RecurrenceKind },
): Promise<{ id: string }> {
  const reminder = await RemindersRepo.create({
    url,
    fireAt,
    ...(opts?.titleHint ? { titleHint: opts.titleHint } : {}),
    ...(opts?.note ? { note: opts.note } : {}),
    ...(opts?.recurrence && opts.recurrence !== "none"
      ? { recurrence: opts.recurrence }
      : {}),
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

  // Recurring reminders advance to the next occurrence; one-shots get
  // marked fired so they fall to the bottom of the list.
  if (reminder.recurrence && reminder.recurrence !== "none") {
    const next = nextOccurrence(reminder.fireAt, reminder.recurrence);
    await RemindersRepo.reschedule(id, next);
    await chrome.alarms.create(alarm.name, { when: next });
  } else {
    await RemindersRepo.markFired(id);
  }
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

  // Notification — clicking opens the tab; the action buttons snooze.
  const note = await NotesRepo.get(reminder.url);
  const message = reminder.note?.trim()
    ? reminder.note
    : note?.body?.trim()
      ? truncate(note.body, 120)
      : reminder.recurrence && reminder.recurrence !== "none"
        ? `Recurring reminder · ${recurrenceLabel(reminder.recurrence)}`
        : "Time to revisit this tab.";

  await chrome.notifications.create(`reminder:${id}`, {
    type: "basic",
    iconUrl: chrome.runtime.getURL("src/assets/icon-128.png"),
    title: reminder.titleHint?.trim() || "Tabsmith reminder",
    message,
    priority: 1,
    requireInteraction: false,
    buttons: SNOOZE_BUTTONS.map((b) => ({ title: b.title })),
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

export async function handleNotificationButtonClick(
  notificationId: string,
  buttonIndex: number,
): Promise<void> {
  if (!notificationId.startsWith("reminder:")) return;
  const id = notificationId.slice("reminder:".length);
  const button = SNOOZE_BUTTONS[buttonIndex];
  if (!button) return;

  // Snooze: schedule a brand-new alarm for the same reminder url, push the
  // existing reminder forward (rescheduling keeps history compact).
  const existing = await RemindersRepo.get(id);
  const fireAt = Date.now() + button.deltaMinutes * 60 * 1000;
  if (existing) {
    await RemindersRepo.reschedule(id, fireAt);
    await chrome.alarms.create(`${ALARM_PREFIX}${id}`, { when: fireAt });
  } else {
    // Original reminder was already deleted; spawn a fresh one tied to the
    // notification so the user's snooze still works.
    const stored = await chrome.storage.session.get(`notif:${notificationId}`);
    const tabId = stored[`notif:${notificationId}`] as number | undefined;
    let url = "";
    let title = "";
    if (typeof tabId === "number") {
      try {
        const tab = await chrome.tabs.get(tabId);
        url = tab.url ?? "";
        title = tab.title ?? "";
      } catch {
        // tab is gone; we'll fall through to the no-op below
      }
    }
    if (url) await scheduleReminder(url, fireAt, { titleHint: title });
  }
  broadcast({ type: "reminders:changed" });
  await chrome.notifications.clear(notificationId);
}

function nextOccurrence(prev: number, kind: RecurrenceKind): number {
  if (kind === "none") return prev;
  const date = new Date(prev);
  const advance = () => {
    if (kind === "daily") date.setDate(date.getDate() + 1);
    else if (kind === "weekly") date.setDate(date.getDate() + 7);
    else if (kind === "monthly") date.setMonth(date.getMonth() + 1);
  };
  advance();
  // If the computed time is in the past (clock skew, sleeping device),
  // keep advancing until we're ahead of now.
  const now = Date.now();
  while (date.getTime() <= now) advance();
  return date.getTime();
}

function recurrenceLabel(kind: RecurrenceKind): string {
  switch (kind) {
    case "daily":
      return "every day";
    case "weekly":
      return "every week";
    case "monthly":
      return "every month";
    case "none":
      return "";
  }
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

export function listenForReminderEvents(): void {
  chrome.notifications.onClicked.addListener(handleNotificationClick);
  chrome.notifications.onButtonClicked.addListener(handleNotificationButtonClick);
}
