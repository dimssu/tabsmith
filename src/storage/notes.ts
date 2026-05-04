import { driver } from "./driver";
import { normalizeUrl } from "@/engine/url";
import { NoteSchema, type Note } from "@/types";

const PREFIX = "notes:";

function key(url: string): string {
  return `${PREFIX}${normalizeUrl(url)}`;
}

export const NotesRepo = {
  async get(url: string): Promise<Note | undefined> {
    const raw = await driver.get<Note>(key(url));
    if (!raw) return undefined;
    const parsed = NoteSchema.safeParse(raw);
    return parsed.success ? parsed.data : undefined;
  },

  async upsert(url: string, body: string, opts?: { pinned?: boolean }): Promise<Note> {
    const now = Date.now();
    const existing = await this.get(url);
    const next: Note = {
      url: normalizeUrl(url),
      body,
      pinned: opts?.pinned ?? existing?.pinned ?? false,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    await driver.set(key(url), NoteSchema.parse(next));
    return next;
  },

  async delete(url: string): Promise<void> {
    await driver.remove(key(url));
  },

  async list(): Promise<Note[]> {
    const all = await driver.getMany<Note>(PREFIX);
    const out: Note[] = [];
    for (const value of Object.values(all)) {
      const parsed = NoteSchema.safeParse(value);
      if (parsed.success) out.push(parsed.data);
    }
    out.sort((a, b) => b.updatedAt - a.updatedAt);
    return out;
  },
};
