import { cluster, type Cluster } from "./cluster";
import { rankGroups } from "./similarity";
import { signatureFor } from "./signature";
import type { GroupMeta, ScoredCandidate, TabLike } from "@/types";

// Public API of the engine — UI and background only need these two functions.

export function suggestExistingGroup(
  newTab: TabLike,
  groups: GroupMeta[],
): ScoredCandidate<GroupMeta> | null {
  if (groups.length === 0) return null;
  const sig = signatureFor(newTab);
  if (!sig.normalizedUrl) return null;
  const ranked = rankGroups(sig, groups);
  return ranked[0] ?? null;
}

export interface NewGroupSuggestion {
  cluster: Cluster;
  fingerprint: string;
}

export function suggestNewGroups(
  tabs: TabLike[],
  opts?: { minSize?: number; similarityThreshold?: number; existingGroupIds?: Set<number> },
): NewGroupSuggestion[] {
  const ungrouped = tabs.filter((t) => {
    if (opts?.existingGroupIds && t.groupId !== undefined && opts.existingGroupIds.has(t.groupId)) {
      return false;
    }
    return t.groupId === undefined || t.groupId === -1 || t.groupId === chromeTabGroupNone();
  });

  const clusterOpts: { minSize?: number; similarityThreshold?: number } = {};
  if (opts?.minSize !== undefined) clusterOpts.minSize = opts.minSize;
  if (opts?.similarityThreshold !== undefined) clusterOpts.similarityThreshold = opts.similarityThreshold;
  const clusters = cluster(ungrouped, clusterOpts);
  return clusters.map((c) => ({ cluster: c, fingerprint: fingerprintCluster(c) }));
}

// chrome.tabGroups.TAB_GROUP_ID_NONE === -1 in MV3. Re-export here to avoid
// pulling chrome typings into a pure module.
function chromeTabGroupNone(): number {
  return -1;
}

export function fingerprintCluster(c: Cluster): string {
  const tabIds = c.members
    .map((m) => m.tabId)
    .filter((v): v is number => typeof v === "number")
    .sort((a, b) => a - b)
    .join(",");
  return `${c.signature.domain}|${c.label}|${tabIds}`;
}
