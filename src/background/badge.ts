import { SuggestionsRepo } from "@/storage";

export async function refreshBadge(): Promise<void> {
  const pending = await SuggestionsRepo.pending();
  const count = pending.length;
  const text = count === 0 ? "" : count > 99 ? "99+" : String(count);
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color: "#5a54dc" });
  await chrome.action.setBadgeTextColor({ color: "#ffffff" });
}
