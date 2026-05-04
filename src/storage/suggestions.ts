import { driver } from "./driver";
import {
  SuggestionSchema,
  SuggestionHistoryEntrySchema,
  type Suggestion,
  type SuggestionHistoryEntry,
} from "@/types";

const PREFIX = "suggestion:";
const HISTORY_KEY = "suggestionHistory";
const HISTORY_LIMIT = 200;

function key(id: string): string {
  return `${PREFIX}${id}`;
}

function uid(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const SuggestionsRepo = {
  async list(): Promise<Suggestion[]> {
    const all = await driver.getMany<Suggestion>(PREFIX);
    const out: Suggestion[] = [];
    for (const v of Object.values(all)) {
      const parsed = SuggestionSchema.safeParse(v);
      if (parsed.success) out.push(parsed.data);
    }
    out.sort((a, b) => b.createdAt - a.createdAt);
    return out;
  },

  async pending(): Promise<Suggestion[]> {
    return (await this.list()).filter((s) => s.status === "pending");
  },

  async create(input: Omit<Suggestion, "id" | "createdAt" | "status">): Promise<Suggestion> {
    const suggestion: Suggestion = SuggestionSchema.parse({
      ...input,
      id: uid(),
      createdAt: Date.now(),
      status: "pending",
    });
    await driver.set(key(suggestion.id), suggestion);
    return suggestion;
  },

  async setStatus(id: string, status: Suggestion["status"]): Promise<void> {
    const raw = await driver.get<Suggestion>(key(id));
    if (!raw) return;
    await driver.set(key(id), { ...raw, status });
  },

  async delete(id: string): Promise<void> {
    await driver.remove(key(id));
  },

  async clearAll(): Promise<void> {
    const all = await driver.getMany<Suggestion>(PREFIX);
    await driver.remove(Object.keys(all));
  },
};

export const SuggestionHistoryRepo = {
  async list(): Promise<SuggestionHistoryEntry[]> {
    const raw = await driver.get<SuggestionHistoryEntry[]>(HISTORY_KEY);
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((entry) => {
      const parsed = SuggestionHistoryEntrySchema.safeParse(entry);
      return parsed.success ? [parsed.data] : [];
    });
  },

  async record(fingerprint: string): Promise<void> {
    const list = await this.list();
    const filtered = list.filter((e) => e.fingerprint !== fingerprint);
    filtered.unshift({ fingerprint, dismissedAt: Date.now() });
    if (filtered.length > HISTORY_LIMIT) filtered.length = HISTORY_LIMIT;
    await driver.set(HISTORY_KEY, filtered);
  },

  async hasRecent(fingerprint: string, withinMs: number): Promise<boolean> {
    const list = await this.list();
    const since = Date.now() - withinMs;
    return list.some((e) => e.fingerprint === fingerprint && e.dismissedAt >= since);
  },
};
