// Thin wrapper over chrome.storage.local with a Map-based fallback for tests.

type StorageRecord = Record<string, unknown>;

export interface StorageDriver {
  get<T>(key: string): Promise<T | undefined>;
  getMany<T>(prefix: string): Promise<Record<string, T>>;
  set(key: string, value: unknown): Promise<void>;
  setMany(entries: StorageRecord): Promise<void>;
  remove(key: string | string[]): Promise<void>;
  clear(): Promise<void>;
  bytesInUse(): Promise<number>;
}

class ChromeDriver implements StorageDriver {
  private get area() {
    return chrome.storage.local;
  }

  async get<T>(key: string): Promise<T | undefined> {
    const out = await this.area.get(key);
    return out[key] as T | undefined;
  }

  async getMany<T>(prefix: string): Promise<Record<string, T>> {
    const all = await this.area.get(null);
    const result: Record<string, T> = {};
    for (const [k, v] of Object.entries(all)) {
      if (k.startsWith(prefix)) result[k] = v as T;
    }
    return result;
  }

  async set(key: string, value: unknown): Promise<void> {
    await this.area.set({ [key]: value });
  }

  async setMany(entries: StorageRecord): Promise<void> {
    await this.area.set(entries);
  }

  async remove(key: string | string[]): Promise<void> {
    await this.area.remove(key);
  }

  async clear(): Promise<void> {
    await this.area.clear();
  }

  async bytesInUse(): Promise<number> {
    return this.area.getBytesInUse(null);
  }
}

class MemoryDriver implements StorageDriver {
  private store = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | undefined> {
    return this.store.get(key) as T | undefined;
  }
  async getMany<T>(prefix: string): Promise<Record<string, T>> {
    const out: Record<string, T> = {};
    for (const [k, v] of this.store) {
      if (k.startsWith(prefix)) out[k] = v as T;
    }
    return out;
  }
  async set(key: string, value: unknown): Promise<void> {
    this.store.set(key, value);
  }
  async setMany(entries: StorageRecord): Promise<void> {
    for (const [k, v] of Object.entries(entries)) this.store.set(k, v);
  }
  async remove(key: string | string[]): Promise<void> {
    if (Array.isArray(key)) key.forEach((k) => this.store.delete(k));
    else this.store.delete(key);
  }
  async clear(): Promise<void> {
    this.store.clear();
  }
  async bytesInUse(): Promise<number> {
    let bytes = 0;
    for (const [k, v] of this.store) {
      bytes += k.length + JSON.stringify(v).length;
    }
    return bytes;
  }
}

const hasChromeStorage =
  typeof chrome !== "undefined" &&
  typeof chrome.storage !== "undefined" &&
  typeof chrome.storage.local !== "undefined";

export const driver: StorageDriver = hasChromeStorage
  ? new ChromeDriver()
  : new MemoryDriver();

// Approximate cap (chrome.storage.local default is ~10MB; we soft-cap at 9MB)
export const SOFT_QUOTA_BYTES = 9 * 1024 * 1024;
