export function cn(...args: Array<string | false | null | undefined>): string {
  return args.filter(Boolean).join(" ");
}

export function relativeTime(timestamp: number, now = Date.now()): string {
  const diff = timestamp - now;
  const abs = Math.abs(diff);
  const SECOND = 1000;
  const MINUTE = 60 * SECOND;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const WEEK = 7 * DAY;

  const sign = diff < 0 ? "" : "in ";
  const suffix = diff < 0 ? " ago" : "";

  if (abs < MINUTE) return diff < 0 ? "just now" : "in a moment";
  if (abs < HOUR) return `${sign}${Math.round(abs / MINUTE)}m${suffix}`;
  if (abs < DAY) return `${sign}${Math.round(abs / HOUR)}h${suffix}`;
  if (abs < WEEK) return `${sign}${Math.round(abs / DAY)}d${suffix}`;
  return `${sign}${Math.round(abs / WEEK)}w${suffix}`;
}

export function shortHost(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export function debounce<T extends (...args: never[]) => void>(
  fn: T,
  ms: number,
): (...args: Parameters<T>) => void {
  let handle: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (handle) clearTimeout(handle);
    handle = setTimeout(() => fn(...args), ms);
  };
}

export function favicon(url: string, size = 32): string {
  try {
    const u = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=${size}`;
  } catch {
    return "";
  }
}
