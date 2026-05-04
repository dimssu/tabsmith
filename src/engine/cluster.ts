import { signatureFor, aggregateSignature } from "./signature";
import { scoreSignaturePair } from "./similarity";
import type { TabLike, TabSignature } from "@/types";

export interface ClusterOptions {
  // Minimum tabs to form a cluster
  minSize: number;
  // Pair-similarity threshold for membership
  similarityThreshold: number;
}

export interface Cluster {
  signature: ReturnType<typeof aggregateSignature>;
  members: TabSignature[];
  // Suggested label, derived from the dominant domain or shared title token
  label: string;
}

const DEFAULT_OPTIONS: ClusterOptions = {
  minSize: 3,
  similarityThreshold: 0.45,
};

// DBSCAN-lite: seed-and-grow over an undirected similarity graph. Avoids the
// classic "epsilon/minPts" parametrization for simplicity and gives stable,
// human-readable groups for tab data.
export function cluster(
  tabs: TabLike[],
  opts: Partial<ClusterOptions> = {},
): Cluster[] {
  const options = { ...DEFAULT_OPTIONS, ...opts };
  const sigs = tabs
    .filter((t) => !!t.url && !!t.url.startsWith && (t.url.startsWith("http://") || t.url.startsWith("https://")))
    .map(signatureFor);

  if (sigs.length < options.minSize) return [];

  // Adjacency by domain bucket first — cheap O(n) precluster
  const byDomain = new Map<string, TabSignature[]>();
  const noDomain: TabSignature[] = [];
  for (const s of sigs) {
    if (!s.domain) {
      noDomain.push(s);
      continue;
    }
    const bucket = byDomain.get(s.domain);
    if (bucket) bucket.push(s);
    else byDomain.set(s.domain, [s]);
  }

  const clusters: Cluster[] = [];

  // 1. Domain seeds: any domain with >= minSize tabs becomes a cluster directly
  for (const [domain, members] of byDomain) {
    if (members.length >= options.minSize) {
      const agg = aggregateSignature(members);
      clusters.push({
        signature: agg,
        members,
        label: pickLabel(domain, agg.titleTokens),
      });
      byDomain.delete(domain);
    }
  }

  // 2. Cross-domain merge by title-token similarity for the leftover singletons.
  //    These often capture cross-domain themes: "react docs" + "react github".
  const leftovers: TabSignature[] = [];
  for (const members of byDomain.values()) leftovers.push(...members);
  leftovers.push(...noDomain);

  const visited = new Set<TabSignature>();
  for (const seed of leftovers) {
    if (visited.has(seed)) continue;
    const members: TabSignature[] = [seed];
    visited.add(seed);
    for (const candidate of leftovers) {
      if (visited.has(candidate)) continue;
      const sim = scoreSignaturePair(seed, candidate).score;
      if (sim >= options.similarityThreshold) {
        members.push(candidate);
        visited.add(candidate);
      }
    }
    if (members.length >= options.minSize) {
      const agg = aggregateSignature(members);
      clusters.push({
        signature: agg,
        members,
        label: pickLabel(agg.domain, agg.titleTokens),
      });
    }
  }

  // Stable sort: largest cluster first
  clusters.sort((a, b) => b.members.length - a.members.length);
  return clusters;
}

function pickLabel(domain: string, tokens: string[]): string {
  if (domain) {
    const head = domain.split(".")[0];
    if (head && head !== "www") return capitalize(head);
  }
  if (tokens.length > 0) return capitalize(tokens[0]);
  return "Group";
}

function capitalize(s: string): string {
  if (!s) return s;
  return s[0].toUpperCase() + s.slice(1);
}
