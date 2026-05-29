import { RemindersRepo, SuggestionsRepo } from "@/storage";

// The action-icon badge surfaces two kinds of attention-needing items:
// pending suggestions (informational) and unacknowledged fired reminders
// (more urgent). Reminders win the color so the user can tell at a glance
// that something time-sensitive needs their eyes.
const SUGGESTION_COLOR = "#5a54dc"; // accent
const REMINDER_COLOR = "#dc2626"; // red-600

export async function refreshBadge(): Promise<void> {
  const [pending, missed] = await Promise.all([
    SuggestionsRepo.pending(),
    RemindersRepo.unacknowledged(),
  ]);

  const count = pending.length + missed.length;
  const text = count === 0 ? "" : count > 99 ? "99+" : String(count);

  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({
    color: missed.length > 0 ? REMINDER_COLOR : SUGGESTION_COLOR,
  });
  await chrome.action.setBadgeTextColor({ color: "#ffffff" });

  // Title hint so hovering the icon explains the badge — helps users learn
  // what they're being summoned for.
  const titleParts: string[] = [];
  if (missed.length > 0) {
    titleParts.push(
      `${missed.length} unacknowledged reminder${missed.length === 1 ? "" : "s"}`,
    );
  }
  if (pending.length > 0) {
    titleParts.push(
      `${pending.length} group suggestion${pending.length === 1 ? "" : "s"}`,
    );
  }
  const title = titleParts.length > 0 ? `Tabsmith — ${titleParts.join(" · ")}` : "Tabsmith";
  await chrome.action.setTitle({ title });
}
