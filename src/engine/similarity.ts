import { jaccard } from "./tokens";
import type { GroupMeta, ScoredCandidate, TabSignature } from "@/types";

export const WEIGHTS = {
  domain: 0.5,
  path: 0.2,
  title: 0.3,
} as const;

export interface ScoreInputs {
  domain: number;
  path: number;
  title: number;
}

export function combine(scores: ScoreInputs): number {
  return (
    scores.domain * WEIGHTS.domain +
    scores.path * WEIGHTS.path +
    scores.title * WEIGHTS.title
  );
}

export function scoreSignaturePair(a: TabSignature, b: TabSignature): ScoredCandidate<TabSignature> {
  const domainMatch = a.domain && b.domain && a.domain === b.domain ? 1 : 0;
  const pathScore = jaccard(a.pathSegments, b.pathSegments);
  const titleScore = jaccard(a.titleTokens, b.titleTokens);
  const breakdown = { domain: domainMatch, path: pathScore, title: titleScore };
  return { candidate: b, score: combine(breakdown), breakdown };
}

export function scoreAgainstGroup(
  signature: TabSignature,
  group: GroupMeta,
): ScoredCandidate<GroupMeta> {
  const domainMatch =
    signature.domain && group.domainSeed && signature.domain === group.domainSeed ? 1 : 0;
  // Approximate group "path segments" via title tokens too — when present, we
  // prefer the explicit aggregate. Path overlap is weaker but useful for
  // distinguishing /docs vs /pulls within github.
  const pathScore = jaccard(signature.pathSegments, group.tokenSignature);
  const titleScore = jaccard(signature.titleTokens, group.tokenSignature);
  const breakdown = { domain: domainMatch, path: pathScore, title: titleScore };
  return { candidate: group, score: combine(breakdown), breakdown };
}

export function rankGroups(
  signature: TabSignature,
  groups: GroupMeta[],
): ScoredCandidate<GroupMeta>[] {
  return groups
    .map((g) => scoreAgainstGroup(signature, g))
    .sort((a, b) => b.score - a.score);
}
