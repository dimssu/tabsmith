// Tiny ranking helper for the command palette. Substring + token-prefix
// matching with a simple weighted score — good enough for the volumes a
// single browser holds (a few hundred items) without pulling in a fuzzy lib.

export interface Searchable {
  title: string;
  url: string;
  body?: string;
}

export interface ScoredSearchable<T extends Searchable> {
  item: T;
  score: number;
}

export function scoreMatch(query: string, item: Searchable): number {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const title = (item.title ?? "").toLowerCase();
  const url = (item.url ?? "").toLowerCase();
  const body = (item.body ?? "").toLowerCase();

  // Hard floor — at least one of the haystacks must contain every query token
  const tokens = q.split(/\s+/).filter(Boolean);
  const haystack = `${title}\n${url}\n${body}`;
  for (const tok of tokens) {
    if (!haystack.includes(tok)) return 0;
  }

  let score = 0;
  if (title === q) score += 0.85; // exact title match — strongest signal
  else if (title.startsWith(q)) score += 0.6;
  else if (title.includes(q)) score += 0.4;

  if (url.includes(q)) score += 0.15;
  if (body.includes(q)) score += 0.1;

  // Bonus for token-coverage in the title
  const titleTokens = title.split(/[\s/_\-:|·]+/).filter(Boolean);
  const titleCovered = tokens.filter((t) =>
    titleTokens.some((tt) => tt.startsWith(t)),
  ).length;
  if (tokens.length > 0) score += 0.25 * (titleCovered / tokens.length);

  // Tiebreaker: favor concise titles. Drops at most 0.05 across the full
  // length range so it never beats a semantic signal.
  if (title.length > 0) {
    const lengthPenalty = Math.min(0.05, title.length / 2000);
    score -= lengthPenalty;
  }

  return Math.max(0, Math.min(1, score));
}

export function rankAll<T extends Searchable>(
  query: string,
  items: T[],
  limit = 25,
): ScoredSearchable<T>[] {
  const out: ScoredSearchable<T>[] = [];
  for (const item of items) {
    const score = scoreMatch(query, item);
    if (score > 0) out.push({ item, score });
  }
  out.sort((a, b) => b.score - a.score);
  return out.slice(0, limit);
}
