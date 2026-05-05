import {
  GroupMetaRepo,
  PreferencesRepo,
  SuggestionsRepo,
  SuggestionHistoryRepo,
} from "@/storage";
import { suggestExistingGroup, suggestNewGroups } from "@/engine";
import { broadcast } from "@/messaging/client";
import { refreshBadge } from "./badge";
import type { TabLike } from "@/types";

const SUPPRESSION_WINDOW_MS = 1000 * 60 * 60 * 24; // 24 hours

export async function analyzeNewTab(tab: TabLike): Promise<void> {
  if (!tab.url || !tab.id) return;
  if (!tab.url.startsWith("http://") && !tab.url.startsWith("https://")) return;
  if (tab.windowId === undefined) return;

  const prefs = await PreferencesRepo.get();
  // Chrome tab groups never span windows, so an "add to existing group"
  // suggestion only makes sense if the candidate group lives in the same
  // window as the new tab.
  const groups = (await GroupMetaRepo.list()).filter(
    (g) => g.windowId === tab.windowId && g.groupId !== tab.groupId,
  );
  if (groups.length === 0) return;

  const result = suggestExistingGroup(tab, groups);
  if (!result || result.score < prefs.assignThreshold) return;

  const fingerprint = `assign|${tab.id}|${result.candidate.groupId}`;
  if (await SuggestionHistoryRepo.hasRecent(fingerprint, SUPPRESSION_WINDOW_MS)) return;

  // Avoid duplicate pending suggestions for the same fingerprint
  const pending = await SuggestionsRepo.pending();
  if (
    pending.some(
      (s) =>
        s.kind === "assign" &&
        s.tabIds.includes(tab.id!) &&
        s.targetGroupId === result.candidate.groupId,
    )
  ) {
    return;
  }

  await SuggestionsRepo.create({
    kind: "assign",
    windowId: tab.windowId,
    tabIds: [tab.id],
    targetGroupId: result.candidate.groupId,
    confidence: result.score,
    reason: buildAssignReason(result.candidate.title, result.candidate.domainSeed),
    proposedTitle: result.candidate.title,
  });

  broadcast({ type: "suggestions:changed" });
  await refreshBadge();
}

function buildAssignReason(groupTitle: string, domainSeed?: string): string {
  const label = groupTitle?.trim() || domainSeed || "this group";
  return `Looks like it belongs in “${label}”.`;
}

export async function analyzeFullWindow(windowId?: number): Promise<number> {
  // Always scope to a single window — Chrome tab groups can't span windows,
  // so a multi-window cluster would never be applyable. If the caller didn't
  // specify, fall back to the focused window.
  let targetWindowId = windowId;
  if (targetWindowId === undefined) {
    try {
      const win = await chrome.windows.getLastFocused({ windowTypes: ["normal"] });
      if (win.id !== undefined) targetWindowId = win.id;
    } catch {
      return 0;
    }
  }
  if (targetWindowId === undefined) return 0;

  const tabs = await chrome.tabs.query({ windowId: targetWindowId });
  const prefs = await PreferencesRepo.get();
  const newGroups = suggestNewGroups(tabs, {
    minSize: prefs.minClusterSize,
    similarityThreshold: prefs.createThreshold,
  });

  const pending = await SuggestionsRepo.pending();
  let created = 0;

  for (const ng of newGroups) {
    if (await SuggestionHistoryRepo.hasRecent(ng.fingerprint, SUPPRESSION_WINDOW_MS)) continue;
    if (
      pending.some(
        (p) =>
          p.kind === "create" &&
          p.windowId === targetWindowId &&
          p.reason.includes(ng.cluster.label),
      )
    ) {
      continue;
    }

    await SuggestionsRepo.create({
      kind: "create",
      windowId: targetWindowId,
      tabIds: ng.cluster.members
        .map((m) => m.tabId)
        .filter((v): v is number => typeof v === "number"),
      proposedTitle: ng.cluster.label,
      proposedColor: pickColor(prefs.groupColors, ng.cluster.label),
      confidence: 0.7,
      reason: buildCreateReason(ng.cluster.members.length, ng.cluster.label),
    });
    created++;
  }

  if (created > 0) {
    broadcast({ type: "suggestions:changed" });
    await refreshBadge();
  }
  return created;
}

function buildCreateReason(count: number, label: string): string {
  return `${count} tabs look related — group as “${label}”?`;
}

function pickColor(palette: string[], seed: string): string {
  if (palette.length === 0) return "blue";
  let hash = 0;
  for (const ch of seed) hash = ((hash << 5) - hash + ch.charCodeAt(0)) | 0;
  const idx = Math.abs(hash) % palette.length;
  return palette[idx];
}

export async function applySuggestion(
  id: string,
): Promise<{ ok: boolean; appliedTo?: number }> {
  const all = await SuggestionsRepo.list();
  const suggestion = all.find((s) => s.id === id);
  if (!suggestion || suggestion.status !== "pending") return { ok: false };

  try {
    if (suggestion.kind === "assign" && suggestion.targetGroupId !== undefined) {
      await chrome.tabs.group({
        groupId: suggestion.targetGroupId,
        tabIds: suggestion.tabIds as [number, ...number[]],
      });
      await SuggestionsRepo.setStatus(id, "accepted");
      broadcast({ type: "suggestions:changed" });
      await refreshBadge();
      return { ok: true, appliedTo: suggestion.targetGroupId };
    }
    if (suggestion.kind === "create" && suggestion.tabIds.length >= 2) {
      const groupId = await chrome.tabs.group({
        tabIds: suggestion.tabIds as [number, ...number[]],
      });
      await chrome.tabGroups.update(groupId, {
        title: suggestion.proposedTitle ?? "Group",
        color: (suggestion.proposedColor as chrome.tabGroups.ColorEnum) ?? "blue",
      });
      await SuggestionsRepo.setStatus(id, "accepted");
      broadcast({ type: "suggestions:changed" });
      await refreshBadge();
      return { ok: true, appliedTo: groupId };
    }
  } catch (err) {
    console.warn("[tabsmith] failed to apply suggestion", err);
    return { ok: false };
  }
  return { ok: false };
}

export async function dismissSuggestion(id: string): Promise<void> {
  const all = await SuggestionsRepo.list();
  const suggestion = all.find((s) => s.id === id);
  if (!suggestion) return;
  const fingerprint =
    suggestion.kind === "assign"
      ? `assign|${suggestion.tabIds[0]}|${suggestion.targetGroupId}`
      : `create|${suggestion.proposedTitle}|${suggestion.tabIds.sort((a, b) => a - b).join(",")}`;
  await SuggestionHistoryRepo.record(fingerprint);
  await SuggestionsRepo.setStatus(id, "dismissed");
  // Garbage-collect dismissed suggestion record after status update
  await SuggestionsRepo.delete(id);
  broadcast({ type: "suggestions:changed" });
  await refreshBadge();
}
