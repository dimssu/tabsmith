import { extractDomain, normalizeUrl, pathSegments, registrableDomain } from "./url";
import { tokenize, uniq } from "./tokens";
import type { TabLike, TabSignature } from "@/types";

export function signatureFor(tab: TabLike): TabSignature {
  const url = tab.url ?? "";
  const normalizedUrl = normalizeUrl(url);
  const host = extractDomain(url);
  const domain = registrableDomain(host);
  const segs = pathSegments(url);
  // Keep only the first three segments — deeper paths are usually
  // article-specific and add noise to similarity.
  const segments = segs.slice(0, 3);
  const titleTokens = uniq(tokenize(tab.title));
  return {
    ...(tab.id !== undefined ? { tabId: tab.id } : {}),
    url,
    normalizedUrl,
    domain,
    pathSegments: segments,
    titleTokens,
  };
}

export function aggregateSignature(signatures: TabSignature[]): {
  domain: string;
  pathSegments: string[];
  titleTokens: string[];
} {
  if (signatures.length === 0) {
    return { domain: "", pathSegments: [], titleTokens: [] };
  }
  // Domain: most common
  const domainCounts = new Map<string, number>();
  for (const s of signatures) {
    if (!s.domain) continue;
    domainCounts.set(s.domain, (domainCounts.get(s.domain) ?? 0) + 1);
  }
  const dominantDomain =
    Array.from(domainCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

  // Path/title: union, but cap each at 32 tokens to keep storage bounded
  const pathSet = new Set<string>();
  const titleSet = new Set<string>();
  for (const s of signatures) {
    s.pathSegments.forEach((p) => pathSet.add(p));
    s.titleTokens.forEach((t) => titleSet.add(t));
  }
  return {
    domain: dominantDomain,
    pathSegments: Array.from(pathSet).slice(0, 32),
    titleTokens: Array.from(titleSet).slice(0, 32),
  };
}
