import { driver } from "./driver";
import { PreferencesSchema, type Preferences } from "@/types";

const KEY = "prefs";

export const PreferencesRepo = {
  async get(): Promise<Preferences> {
    const raw = await driver.get<Preferences>(KEY);
    const parsed = PreferencesSchema.safeParse(raw ?? {});
    if (parsed.success) return parsed.data;
    const fallback = PreferencesSchema.parse({});
    await driver.set(KEY, fallback);
    return fallback;
  },

  async update(patch: Partial<Preferences>): Promise<Preferences> {
    const current = await this.get();
    const next = PreferencesSchema.parse({ ...current, ...patch });
    await driver.set(KEY, next);
    return next;
  },

  async reset(): Promise<Preferences> {
    const next = PreferencesSchema.parse({});
    await driver.set(KEY, next);
    return next;
  },
};
