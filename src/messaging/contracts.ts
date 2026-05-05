import type { Note, Reminder, Suggestion, Preferences, RecurrenceKind } from "@/types";

// Discriminated union of every message that crosses the runtime boundary.
// Each request type R has a paired response type Response<R> below.

export type Message =
  | { type: "ping" }
  | { type: "suggestions:list"; windowId?: number }
  | { type: "suggestions:accept"; id: string }
  | { type: "suggestions:dismiss"; id: string }
  | { type: "suggestions:analyzeNow"; windowId?: number }
  | { type: "notes:get"; url: string }
  | { type: "notes:upsert"; url: string; body: string; pinned?: boolean }
  | { type: "notes:list" }
  | { type: "notes:delete"; url: string }
  | { type: "reminders:create"; url: string; fireAt: number; titleHint?: string; note?: string; recurrence?: RecurrenceKind }
  | { type: "reminders:list" }
  | { type: "reminders:delete"; id: string }
  | { type: "groups:listForCurrentWindow" }
  | { type: "groups:rename"; groupId: number; title: string }
  | { type: "groups:recolor"; groupId: number; color: string }
  | { type: "tabs:current" }
  | { type: "tabs:focusOrOpen"; url: string }
  | { type: "search:everything"; query: string; windowId?: number; limit?: number }
  | { type: "prefs:get" }
  | { type: "prefs:update"; patch: Partial<Preferences> }
  | { type: "data:export" }
  | { type: "data:import"; payload: unknown }
  | { type: "data:clearAll" };

export type Response<M extends Message> =
  M extends { type: "ping" } ? { ok: true }
  : M extends { type: "suggestions:list" } ? Suggestion[]
  : M extends { type: "suggestions:accept" } ? { ok: boolean; appliedTo?: number }
  : M extends { type: "suggestions:dismiss" } ? { ok: true }
  : M extends { type: "suggestions:analyzeNow" } ? { created: number }
  : M extends { type: "notes:get" } ? Note | null
  : M extends { type: "notes:upsert" } ? Note
  : M extends { type: "notes:list" } ? Note[]
  : M extends { type: "notes:delete" } ? { ok: true }
  : M extends { type: "reminders:create" } ? Reminder
  : M extends { type: "reminders:list" } ? Reminder[]
  : M extends { type: "reminders:delete" } ? { ok: true }
  : M extends { type: "groups:listForCurrentWindow" } ? GroupSummary[]
  : M extends { type: "groups:rename" } ? { ok: true }
  : M extends { type: "groups:recolor" } ? { ok: true }
  : M extends { type: "tabs:current" } ? CurrentTab | null
  : M extends { type: "tabs:focusOrOpen" } ? { tabId: number }
  : M extends { type: "search:everything" } ? SearchHit[]
  : M extends { type: "prefs:get" } ? Preferences
  : M extends { type: "prefs:update" } ? Preferences
  : M extends { type: "data:export" } ? ExportPayload
  : M extends { type: "data:import" } ? { imported: number }
  : M extends { type: "data:clearAll" } ? { ok: true }
  : never;

export interface GroupSummary {
  groupId: number;
  title: string;
  color: string;
  memberCount: number;
}

export interface CurrentTab {
  tabId: number;
  url: string;
  normalizedUrl: string;
  title: string;
  groupId: number;
  windowId: number;
  favIconUrl?: string;
}

export type SearchHitKind = "tab" | "note" | "reminder" | "closed";

export interface SearchHit {
  kind: SearchHitKind;
  url: string;
  title: string;
  subtitle?: string;
  // For tabs / closed: ids needed to focus or restore
  tabId?: number;
  windowId?: number;
  sessionId?: string;
  // Score in [0, 1] for ranking
  score: number;
  // Optional preview text (note body excerpt)
  excerpt?: string;
}

export interface ExportPayload {
  exportedAt: number;
  schemaVersion: number;
  notes: Note[];
  reminders: Reminder[];
  preferences: Preferences;
}

// Broadcast events pushed from the background worker to surfaces.
export type Broadcast =
  | { type: "suggestions:changed" }
  | { type: "notes:changed"; url: string }
  | { type: "reminders:changed" }
  | { type: "prefs:changed" }
  | { type: "palette:open" };

export const BROADCAST_CHANNEL = "tabsmith-broadcast";
