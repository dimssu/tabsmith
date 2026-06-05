import { RemindersRepo, NotesRepo, PreferencesRepo } from "@/storage";
import { normalizeUrl } from "@/engine";
import { broadcast } from "@/messaging/client";
import { refreshBadge } from "./badge";
import { bannerInjector, type BannerPayload } from "./banner";
import { DEFAULT_SNOOZE_PRESETS } from "@/shared/snooze";
import type { RecurrenceKind, SnoozePreset } from "@/types";

// Accent color used for the in-page banner accent stripe — keep in sync
// with the --accent CSS variable in src/styles/tokens.css.
const BANNER_ACCENT_RGB = "90 84 220";

const ALARM_PREFIX = "reminder:";

// Chrome notifications only support 2 buttons, so we use the user's top-2
// snooze presets. Resolved at fire-time so changes in Options take effect
// immediately without needing a restart.
async function getNotificationButtons(): Promise<SnoozePreset[]> {
  const prefs = await PreferencesRepo.get();
  const presets = prefs.snoozePresets.length > 0 ? prefs.snoozePresets : DEFAULT_SNOOZE_PRESETS;
  return presets.slice(0, 2);
}

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

  // Locate the user's currently-active tab (where their attention actually
  // is right now). This is where the in-page banner goes — NOT the
  // reminder's source tab, which may be in a different window or hidden.
  // We never auto-focus or auto-open the source tab on fire; navigating
  // there is opt-in via the banner / notification 'Open tab' action.
  const focusedWindow = await chrome.windows
    .getLastFocused({ windowTypes: ["normal"] })
    .catch(() => null);
  const activeTabs =
    focusedWindow?.id !== undefined
      ? await chrome.tabs.query({ active: true, windowId: focusedWindow.id })
      : [];
  const userActiveTab = activeTabs[0];

  // Separately find the reminder's source tab if it's still open anywhere.
  const normalized = normalizeUrl(reminder.url);
  const allTabs = await chrome.tabs.query({});
  const sourceTab = allTabs.find(
    (t) => normalizeUrl(t.url ?? "") === normalized,
  );

  // Build the message we'll use across both the OS notification and the
  // in-page banner.
  const note = await NotesRepo.get(reminder.url);
  const message = reminder.note?.trim()
    ? reminder.note
    : note?.body?.trim()
      ? truncate(note.body, 200)
      : reminder.recurrence && reminder.recurrence !== "none"
        ? `Recurring reminder · ${recurrenceLabel(reminder.recurrence)}`
        : "Time to revisit this tab.";
  const title = reminder.titleHint?.trim() || "Tabsmith reminder";

  // Resolve the user's snooze presets once for both surfaces.
  const prefs = await PreferencesRepo.get();
  const presets =
    prefs.snoozePresets.length > 0 ? prefs.snoozePresets : DEFAULT_SNOOZE_PRESETS;
  const notificationButtons = presets.slice(0, 2);

  // 1) OS notification — fires regardless of which window/app the user is in.
  //    requireInteraction keeps it on screen until the user dismisses it.
  try {
    await chrome.notifications.create(`reminder:${id}`, {
      type: "basic",
      iconUrl: chrome.runtime.getURL("src/assets/icon-128.png"),
      title,
      message,
      priority: 2,
      requireInteraction: true,
      buttons: notificationButtons.map((b) => ({ title: `Snooze ${b.label}` })),
    });
    await chrome.storage.session.set({
      [`notif:reminder:${id}:presets`]: notificationButtons,
    });
  } catch (err) {
    console.warn("[tabsmith] OS notification failed", err);
  }

  // 2) In-page banner — inject on whatever tab the user is currently looking
  //    at. Fall back to the source tab only if the active tab is restricted
  //    (chrome:// / extension:// / the web store all reject scripting).
  const bannerPayload: BannerPayload = {
    reminderId: id,
    title,
    body: message,
    accentRgb: BANNER_ACCENT_RGB,
    presets,
    // Tell the banner whether an "Open tab" action makes sense.
    hasSource: !!reminder.url,
    ...(prefs.lastSnoozeMinutes !== undefined
      ? { lastCustomMinutes: prefs.lastSnoozeMinutes }
      : {}),
  };

  let bannerDelivered = false;
  if (userActiveTab?.id !== undefined) {
    bannerDelivered = await injectBanner(userActiveTab.id, bannerPayload);
  }
  // Belt-and-braces: if the user's current tab was restricted (chrome://,
  // etc.) and the source tab is somewhere else and is a regular page, try
  // there too. Better than no banner at all.
  if (
    !bannerDelivered &&
    sourceTab?.id !== undefined &&
    sourceTab.id !== userActiveTab?.id
  ) {
    await injectBanner(sourceTab.id, bannerPayload);
  }

  // 3) Persist what the notification click / banner 'Open tab' action will
  //    need to navigate back to the source. We store the URL too in case
  //    the source tab gets closed between fire and click.
  await chrome.storage.session.set({
    [`reminder:${id}:source`]: {
      url: reminder.url,
      tabId: sourceTab?.id,
      windowId: sourceTab?.windowId,
    },
  });

  // 4) Badge update + reminders:changed broadcast already fired above.
  await refreshBadge();
}

async function injectBanner(tabId: number, payload: BannerPayload): Promise<boolean> {
  // The target tab may not be fully loaded yet (rare, but possible if the
  // user just opened it). Wait briefly until status === 'complete' before
  // injecting so the banner has a <body> to attach to.
  const ready = await waitForTabReady(tabId, 5_000);
  if (!ready) return false;
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: bannerInjector,
      args: [payload],
    });
    return true;
  } catch (err) {
    // chrome://, edge://, the web store, and other restricted pages reject
    // scripting injection. Caller can fall back to another tab.
    console.warn("[tabsmith] banner injection failed", err);
    return false;
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
  // Clicking the body of the OS notification is the explicit "take me there"
  // signal — that's when we actually navigate to the source tab.
  await openReminderSource(id);
  await chrome.notifications.clear(notificationId);
  await acknowledgeReminder(id);
}

// Focus the reminder's source tab if it's still open, else open the URL in
// the user's current window. Called from the OS-notification body click
// and from the banner's "Open tab" action.
export async function openReminderSource(id: string): Promise<void> {
  const key = `reminder:${id}:source`;
  const stash = await chrome.storage.session.get(key);
  const source = stash[key] as
    | { url?: string; tabId?: number; windowId?: number }
    | undefined;
  // Try the stashed tabId first (fastest path), then look up by normalized
  // URL across all windows, then open a fresh tab.
  if (source?.tabId !== undefined) {
    try {
      const tab = await chrome.tabs.get(source.tabId);
      if (tab.windowId !== undefined) {
        await chrome.windows.update(tab.windowId, { focused: true });
      }
      await chrome.tabs.update(source.tabId, { active: true });
      await chrome.storage.session.remove(key);
      return;
    } catch {
      // tab is gone — fall through to URL lookup
    }
  }
  if (source?.url) {
    const normalized = normalizeUrl(source.url);
    const tabs = await chrome.tabs.query({});
    const match = tabs.find((t) => normalizeUrl(t.url ?? "") === normalized);
    if (match?.id !== undefined) {
      if (match.windowId !== undefined) {
        await chrome.windows.update(match.windowId, { focused: true });
      }
      await chrome.tabs.update(match.id, { active: true });
    } else {
      await chrome.tabs.create({ url: source.url, active: true });
    }
  }
  await chrome.storage.session.remove(key);
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

  // Look up the presets we used when creating this notification; fall back
  // to the live user preferences if the session record is gone.
  const presetsKey = `${notificationId}:presets`;
  const stash = await chrome.storage.session.get(presetsKey);
  let presets = stash[presetsKey] as SnoozePreset[] | undefined;
  if (!presets || presets.length === 0) {
    presets = await getNotificationButtons();
  }
  const button = presets[buttonIndex];
  if (!button) return;

  const existing = await RemindersRepo.get(id);
  if (existing) {
    await snoozeReminder(id, button.minutes);
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
      await scheduleReminder(url, Date.now() + button.minutes * 60 * 1000, {
        titleHint: title,
      });
    }
    broadcast({ type: "reminders:changed" });
    await chrome.notifications.clear(notificationId);
    await refreshBadge();
  }
  await chrome.storage.session.remove(presetsKey);
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
