import { driver } from "./driver";
import { ReminderSchema, type Reminder } from "@/types";

const PREFIX = "reminders:";

function key(id: string): string {
  return `${PREFIX}${id}`;
}

function uid(): string {
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const RemindersRepo = {
  async get(id: string): Promise<Reminder | undefined> {
    const raw = await driver.get<Reminder>(key(id));
    if (!raw) return undefined;
    const parsed = ReminderSchema.safeParse(raw);
    return parsed.success ? parsed.data : undefined;
  },

  async create(input: {
    url: string;
    fireAt: number;
    titleHint?: string;
    note?: string;
  }): Promise<Reminder> {
    const id = uid();
    const reminder: Reminder = {
      id,
      url: input.url,
      fireAt: input.fireAt,
      createdAt: Date.now(),
      fired: false,
      ...(input.titleHint ? { titleHint: input.titleHint } : {}),
      ...(input.note ? { note: input.note } : {}),
    };
    await driver.set(key(id), ReminderSchema.parse(reminder));
    return reminder;
  },

  async markFired(id: string): Promise<void> {
    const existing = await this.get(id);
    if (!existing) return;
    await driver.set(key(id), { ...existing, fired: true });
  },

  async delete(id: string): Promise<void> {
    await driver.remove(key(id));
  },

  async list(): Promise<Reminder[]> {
    const all = await driver.getMany<Reminder>(PREFIX);
    const out: Reminder[] = [];
    for (const v of Object.values(all)) {
      const parsed = ReminderSchema.safeParse(v);
      if (parsed.success) out.push(parsed.data);
    }
    out.sort((a, b) => a.fireAt - b.fireAt);
    return out;
  },

  async pending(): Promise<Reminder[]> {
    return (await this.list()).filter((r) => !r.fired);
  },
};
