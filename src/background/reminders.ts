import { RemindersRepo, NotesRepo } from "@/storage";
import { normalizeUrl } from "@/engine";
import { broadcast } from "@/messaging/client";
import { refreshBadge } from "./badge";
import { bannerInjector, type BannerPayload } from "./banner";
import type { RecurrenceKind } from "@/types";

// Accent color used for the in-page banner accent stripe — keep in sync
// with the --accent CSS variable in src/styles/tokens.css.
const BANNER_ACCENT_RGB = "90 84 220";

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

  // Build the message we'll use across both the OS notification and the
  // in-page banner — keep them in sync.
  const note = await NotesRepo.get(reminder.url);
  const message = reminder.note?.trim()
    ? reminder.note
    : note?.body?.trim()
      ? truncate(note.body, 200)
      : reminder.recurrence && reminder.recurrence !== "none"
        ? `Recurring reminder · ${recurrenceLabel(reminder.recurrence)}`
        : "Time to revisit this tab.";
  const title = reminder.titleHint?.trim() || "Tabsmith reminder";

  // 1) Try a persistent OS notification. requireInteraction keeps it on
  //    screen until the user dismisses it (instead of auto-fading after
  //    a few seconds).
  try {
    await chrome.notifications.create(`reminder:${id}`, {
      type: "basic",
      iconUrl: chrome.runtime.getURL("src/assets/icon-128.png"),
      title,
      message,
      priority: 2,
      requireInteraction: true,
      buttons: SNOOZE_BUTTONS.map((b) => ({ title: b.title })),
    });
  } catch (err) {
    console.warn("[tabsmith] OS notification failed", err);
  }

  // 2) Inject an in-page banner. This is the workhorse — it shows up even
  //    when OS notifications are blocked or DND is on, and gives the user
  //    explicit Snooze / Got it controls right where their attention is.
  if (targetTabId !== undefined) {
    await injectBanner(targetTabId, {
      reminderId: id,
      title,
      body: message,
      accentRgb: BANNER_ACCENT_RGB,
    });
  }

  // 3) Stash the target so the click handler can focus it
  if (targetTabId !== undefined) {
    await chrome.storage.session.set({ [`notif:reminder:${id}`]: targetTabId });
  }

  // 4) Side panel callout / badge refresh — handled by reminders:changed
  //    broadcast above plus the badge update.
  await refreshBadge();
}

async function injectBanner(tabId: number, payload: BannerPayload): Promise<void> {
  // The target tab may have just been created and not finished loading; wait
  // briefly until status === 'complete' before injecting so the banner has a
  // <body> to attach to.
  const ready = await waitForTabReady(tabId, 5_000);
  if (!ready) return;
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: bannerInjector,
      args: [payload],
    });
  } catch (err) {
    // chrome://, edge://, the web store, and other restricted pages reject
    // scripting injection. The badge + side-panel callout still cover us.
    console.warn("[tabsmith] banner injection failed", err);
  }
}

async function waitForTabReady(tabId: number, timeoutMs: number): Promise<boolean> {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab.status === "complete") return true;
  } catch {
    return false;
  }
  return new Promise((resolve) => {
    const onUpdated = (
      updatedTabId: number,
      info: chrome.tabs.TabChangeInfo,
    ) => {
      if (updatedTabId === tabId && info.status === "complete") {
        chrome.tabs.onUpdated.removeListener(onUpdated);
        clearTimeout(timer);
        resolve(true);
      }
    };
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      resolve(false);
    }, timeoutMs);
    chrome.tabs.onUpdated.addListener(onUpdated);
  });
}

export async function handleNotificationClick(notificationId: string): Promise<void> {
  if (!notificationId.startsWith("reminder:")) return;
  const id = notificationId.slice("reminder:".length);
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
  // Clicking the notification counts as acknowledgment.
  await acknowledgeReminder(id);
}

export async function acknowledgeReminder(id: string): Promise<void> {
  await RemindersRepo.acknowledge(id);
  broadcast({ type: "reminders:changed" });
  await refreshBadge();
}

export async function snoozeReminder(
  id: string,
  deltaMinutes: number,
): Promise<void> {
  const existing = await RemindersRepo.get(id);
  const fireAt = Date.now() + deltaMinutes * 60 * 1000;
  if (existing) {
    await RemindersRepo.reschedule(id, fireAt);
    await chrome.alarms.create(`${ALARM_PREFIX}${id}`, { when: fireAt });
  }
  await chrome.notifications.clear(`reminder:${id}`);
  broadcast({ type: "reminders:changed" });
  await refreshBadge();
}

export async function handleNotificationButtonClick(
  notificationId: string,
  buttonIndex: number,
): Promise<void> {
  if (!notificationId.startsWith("reminder:")) return;
  const id = notificationId.slice("reminder:".length);
  const button = SNOOZE_BUTTONS[buttonIndex];
  if (!button) return;

  const existing = await RemindersRepo.get(id);
  if (existing) {
    await snoozeReminder(id, button.deltaMinutes);
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
    if (url) {
      await scheduleReminder(url, Date.now() + button.deltaMinutes * 60 * 1000, {
        titleHint: title,
      });
    }
    broadcast({ type: "reminders:changed" });
    await chrome.notifications.clear(notificationId);
    await refreshBadge();
  }
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
