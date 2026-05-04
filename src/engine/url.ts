const TRACKING_PREFIXES = ["utm_", "mc_", "_hsenc", "_hsmi", "vero_", "icid_"];
const TRACKING_PARAMS = new Set([
  "gclid",
  "fbclid",
  "msclkid",
  "yclid",
  "dclid",
  "igshid",
  "mkt_tok",
  "ref",
  "ref_src",
  "ref_url",
  "share",
  "spm",
  "trk",
]);

const SPA_FRAGMENT_HOSTS = new Set([
  "docs.google.com",
  "trello.com",
  "calendar.google.com",
  "mail.google.com",
  "app.slack.com",
  "slack.com",
  "linear.app",
  "notion.so",
  "www.notion.so",
]);

const STRIP_HOST_PREFIX = /^www\./;

export function normalizeUrl(raw: string | undefined | null): string {
  if (!raw) return "";
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return raw.trim();
  }

  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== "http:" && protocol !== "https:") {
    // chrome://, file://, about:, extension:, etc — return the full href
    // lowercased so we don't accidentally drop the host portion.
    return parsed.href.toLowerCase();
  }

  const host = parsed.hostname.toLowerCase().replace(STRIP_HOST_PREFIX, "");

  // Filter tracking params
  const params = new URLSearchParams();
  for (const [key, value] of parsed.searchParams) {
    const lower = key.toLowerCase();
    if (TRACKING_PARAMS.has(lower)) continue;
    if (TRACKING_PREFIXES.some((p) => lower.startsWith(p))) continue;
    params.append(key, value);
  }
  const search = params.toString();

  // Path: collapse duplicate slashes, drop trailing slash on non-root paths
  let path = parsed.pathname.replace(/\/{2,}/g, "/");
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);

  let normalized = `${protocol}//${host}${path}`;
  if (search) normalized += `?${search}`;

  // Keep fragment only on known SPA hosts
  if (parsed.hash && SPA_FRAGMENT_HOSTS.has(host)) {
    normalized += parsed.hash;
  }

  return normalized;
}

export function extractDomain(url: string | undefined | null): string {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return parsed.hostname.toLowerCase().replace(STRIP_HOST_PREFIX, "");
  } catch {
    return "";
  }
}

// Reduce host to its registrable-ish form. We don't ship the full PSL;
// good-enough heuristic: keep last two labels, except for known 3-label TLDs.
const COMPOUND_TLDS = new Set([
  "co.uk",
  "co.jp",
  "co.in",
  "co.kr",
  "co.nz",
  "com.au",
  "com.br",
  "com.cn",
  "com.mx",
  "com.tr",
  "com.tw",
  "com.sg",
  "ne.jp",
  "or.jp",
  "ac.uk",
  "gov.uk",
  "org.uk",
]);

export function registrableDomain(host: string): string {
  if (!host) return "";
  const labels = host.split(".");
  if (labels.length <= 2) return host;
  const lastTwo = labels.slice(-2).join(".");
  const lastThree = labels.slice(-3).join(".");
  if (COMPOUND_TLDS.has(lastTwo)) return lastThree;
  return lastTwo;
}

export function pathSegments(url: string | undefined | null): string[] {
  if (!url) return [];
  try {
    const parsed = new URL(url);
    return parsed.pathname
      .split("/")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  } catch {
    return [];
  }
}
