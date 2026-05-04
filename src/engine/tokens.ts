// Lightweight English stopword list — kept small on purpose. The engine
// works on titles, which are usually concise; aggressive filtering helps avoid
// matching noise like "the" or "and".

const STOPWORDS = new Set([
  "a", "about", "above", "after", "again", "all", "am", "an", "and",
  "any", "are", "as", "at", "be", "because", "been", "before", "being",
  "below", "between", "both", "but", "by", "can", "did", "do", "does",
  "doing", "don", "down", "during", "each", "few", "for", "from", "further",
  "had", "has", "have", "having", "he", "her", "here", "hers", "herself",
  "him", "himself", "his", "how", "i", "if", "in", "into", "is", "it",
  "its", "itself", "just", "me", "more", "most", "my", "myself", "no",
  "nor", "not", "now", "of", "off", "on", "once", "only", "or", "other",
  "our", "ours", "out", "over", "own", "s", "same", "she", "should", "so",
  "some", "such", "t", "than", "that", "the", "their", "theirs", "them",
  "themselves", "then", "there", "these", "they", "this", "those", "through",
  "to", "too", "under", "until", "up", "very", "was", "we", "were", "what",
  "when", "where", "which", "while", "who", "whom", "why", "will", "with",
  "you", "your", "yours", "yourself", "yourselves",
  // Site/SEO noise common in <title> tags
  "home", "page", "online", "free", "official", "site", "website", "new",
]);

const SEPARATORS = /[\s /|\\\-_·•—–:,;()[\]{}<>"'`~!?@#$%^&*+=]+/;

// Many sites suffix titles with "— Brand" or "| Brand". Strip everything from
// the last " | " or " - " or " — " onwards if it's at least one separator
// character followed by whitespace and brand-like text. Also drop "(N)" / "[N]"
// notification counters at the start.
const TRAILING_BRAND = /\s+[\-–—|:·]\s+[^|\-–—:·]+$/;
const LEADING_NOTIFICATION = /^[(\[]\s*\d+\+?\s*[)\]]\s*/;

export function cleanTitle(raw: string | undefined): string {
  if (!raw) return "";
  let t = raw.replace(LEADING_NOTIFICATION, "");
  // Strip trailing brand suffix once (some titles have multiple, but one pass
  // covers the common case without eating the meaningful prefix on titles like
  // "RFC 8259 - The JavaScript Object Notation").
  if (t.length > 30) t = t.replace(TRAILING_BRAND, "");
  return t.trim();
}

export function tokenize(title: string | undefined): string[] {
  const cleaned = cleanTitle(title).toLowerCase();
  if (!cleaned) return [];
  const out: string[] = [];
  for (const piece of cleaned.split(SEPARATORS)) {
    if (!piece) continue;
    if (piece.length < 3) continue;
    if (STOPWORDS.has(piece)) continue;
    // crude numeric filter: drop bare numbers (often counters/dates)
    if (/^\d+$/.test(piece)) continue;
    out.push(piece);
  }
  return out;
}

export function uniq<T>(values: Iterable<T>): T[] {
  return Array.from(new Set(values));
}

export function jaccard<T>(a: Iterable<T>, b: Iterable<T>): number {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const v of setA) if (setB.has(v)) intersection++;
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
