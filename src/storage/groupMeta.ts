import { driver } from "./driver";
import { GroupMetaSchema, type GroupMeta } from "@/types";

const PREFIX = "groupMeta:";

function key(groupId: number): string {
  return `${PREFIX}${groupId}`;
}

export const GroupMetaRepo = {
  async get(groupId: number): Promise<GroupMeta | undefined> {
    const raw = await driver.get<GroupMeta>(key(groupId));
    if (!raw) return undefined;
    const parsed = GroupMetaSchema.safeParse(raw);
    return parsed.success ? parsed.data : undefined;
  },

  async upsert(meta: Omit<GroupMeta, "createdAt" | "updatedAt"> & { createdAt?: number }): Promise<GroupMeta> {
    const now = Date.now();
    const existing = await this.get(meta.groupId);
    const next: GroupMeta = GroupMetaSchema.parse({
      ...meta,
      createdAt: meta.createdAt ?? existing?.createdAt ?? now,
      updatedAt: now,
    });
    await driver.set(key(meta.groupId), next);
    return next;
  },

  async delete(groupId: number): Promise<void> {
    await driver.remove(key(groupId));
  },

  async list(): Promise<GroupMeta[]> {
    const all = await driver.getMany<GroupMeta>(PREFIX);
    const out: GroupMeta[] = [];
    for (const v of Object.values(all)) {
      const parsed = GroupMetaSchema.safeParse(v);
      if (parsed.success) out.push(parsed.data);
    }
    return out;
  },
};
