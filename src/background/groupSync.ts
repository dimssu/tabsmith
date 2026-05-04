import { GroupMetaRepo } from "@/storage";
import { aggregateSignature, signatureFor } from "@/engine";
import type { TabLike } from "@/types";

// Refresh GroupMeta records from the live tab strip. We do this on demand
// rather than maintain a delta — the data is small and Chrome is the source
// of truth.
export async function syncGroupsForWindow(windowId: number): Promise<void> {
  const groups = await chrome.tabGroups.query({ windowId });
  const tabs = await chrome.tabs.query({ windowId });

  const byGroup = new Map<number, TabLike[]>();
  for (const tab of tabs) {
    const gid = tab.groupId;
    if (gid === undefined || gid === -1) continue;
    const list = byGroup.get(gid);
    if (list) list.push(tab);
    else byGroup.set(gid, [tab]);
  }

  const liveGroupIds = new Set(groups.map((g) => g.id));
  for (const group of groups) {
    const members = byGroup.get(group.id) ?? [];
    const signatures = members.map((m) => signatureFor(m));
    const agg = aggregateSignature(signatures);
    await GroupMetaRepo.upsert({
      groupId: group.id,
      windowId,
      title: group.title ?? "",
      color: group.color,
      domainSeed: agg.domain,
      tokenSignature: Array.from(new Set([...agg.titleTokens, ...agg.pathSegments])).slice(0, 32),
      memberCount: members.length,
    });
  }

  // Garbage-collect stale meta for groups that no longer exist
  const known = await GroupMetaRepo.list();
  for (const meta of known) {
    if (meta.windowId === windowId && !liveGroupIds.has(meta.groupId)) {
      await GroupMetaRepo.delete(meta.groupId);
    }
  }
}
