import { z } from "zod";

export const NoteSchema = z.object({
  url: z.string().min(1),
  body: z.string().default(""),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  pinned: z.boolean().default(false),
});
export type Note = z.infer<typeof NoteSchema>;

export const RecurrenceKindSchema = z.enum(["none", "daily", "weekly", "monthly"]);
export type RecurrenceKind = z.infer<typeof RecurrenceKindSchema>;

export const ReminderSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
  titleHint: z.string().optional(),
  fireAt: z.number().int().positive(),
  createdAt: z.number().int().nonnegative(),
  fired: z.boolean().default(false),
  note: z.string().optional(),
  recurrence: RecurrenceKindSchema.optional(),
  // Counter for diagnostics; bumps by 1 each time a recurring reminder fires.
  fireCount: z.number().int().nonnegative().default(0),
  // When the user explicitly acknowledged the fire (clicked "Got it" in the
  // banner / notification, or dismissed from the Missed list). Used to keep
  // the badge and the side-panel callout honest when the OS notification is
  // suppressed or the user just stepped away.
  acknowledgedAt: z.number().int().nonnegative().optional(),
});
export type Reminder = z.infer<typeof ReminderSchema>;

export const GroupMetaSchema = z.object({
  groupId: z.number().int(),
  windowId: z.number().int().optional(),
  title: z.string().default(""),
  color: z.string().optional(),
  domainSeed: z.string().optional(),
  tokenSignature: z.array(z.string()).default([]),
  memberCount: z.number().int().nonnegative().default(0),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
});
export type GroupMeta = z.infer<typeof GroupMetaSchema>;

export const SuggestionKindSchema = z.enum(["assign", "create"]);
export type SuggestionKind = z.infer<typeof SuggestionKindSchema>;

export const SuggestionSchema = z.object({
  id: z.string().min(1),
  kind: SuggestionKindSchema,
  createdAt: z.number().int().nonnegative(),
  // Window that this suggestion concerns. Chrome groups can't span windows,
  // so every suggestion is anchored to one. Optional for back-compat with
  // suggestions written before this field existed.
  windowId: z.number().int().optional(),
  // Tabs that this suggestion concerns
  tabIds: z.array(z.number().int()).default([]),
  // For "assign": the existing group to merge into
  targetGroupId: z.number().int().optional(),
  // For "create": the proposed group label and color
  proposedTitle: z.string().optional(),
  proposedColor: z.string().optional(),
  // Confidence in [0,1]
  confidence: z.number().min(0).max(1),
  // Free-form reason text shown to the user, e.g. "5 tabs from github.com"
  reason: z.string().default(""),
  // Status
  status: z.enum(["pending", "accepted", "dismissed"]).default("pending"),
});
export type Suggestion = z.infer<typeof SuggestionSchema>;

export const ThemeModeSchema = z.enum(["system", "light", "dark"]);
export type ThemeMode = z.infer<typeof ThemeModeSchema>;

export const SnoozePresetSchema = z.object({
  // Human-readable label shown on buttons ("15 min", "Tomorrow")
  label: z.string().min(1).max(24),
  // Minutes from now to fire — fractional values are allowed but stored
  // as numbers (e.g. 0.5 for 30 seconds, useful in dev/testing).
  minutes: z.number().min(0.1).max(60 * 24 * 365),
});
export type SnoozePreset = z.infer<typeof SnoozePresetSchema>;

// Sensible defaults that cover most snooze intents. Order matters — the
// top two appear as buttons on the OS notification (Chrome's limit).
export const DEFAULT_SNOOZE_PRESETS: SnoozePreset[] = [
  { label: "15 min", minutes: 15 },
  { label: "1 hour", minutes: 60 },
  { label: "3 hours", minutes: 180 },
  { label: "Tomorrow", minutes: 60 * 24 },
  { label: "Next week", minutes: 60 * 24 * 7 },
];

export const PreferencesSchema = z.object({
  assignThreshold: z.number().min(0).max(1).default(0.55),
  createThreshold: z.number().min(0).max(1).default(0.45),
  minClusterSize: z.number().int().min(2).max(20).default(3),
  notificationsEnabled: z.boolean().default(true),
  idleAnalyzeSeconds: z.number().int().min(10).max(600).default(30),
  themeMode: ThemeModeSchema.default("system"),
  noteReadModeDefault: z.boolean().default(true),
  // User-editable snooze choices. Defaults cover the common ground; users
  // can reorder, edit labels, or add their own from the Options page.
  snoozePresets: z.array(SnoozePresetSchema).min(1).max(8).default(DEFAULT_SNOOZE_PRESETS),
  // Most-recent custom snooze value (minutes). Used to pre-fill the
  // custom-time input so users don't re-type their preferred duration.
  lastSnoozeMinutes: z.number().min(0.1).max(60 * 24 * 365).optional(),
  groupColors: z
    .array(z.string())
    .default(["blue", "cyan", "green", "yellow", "orange", "red", "pink", "purple"]),
  schemaVersion: z.number().int().default(1),
});
export type Preferences = z.infer<typeof PreferencesSchema>;

export const SuggestionHistoryEntrySchema = z.object({
  fingerprint: z.string(),
  dismissedAt: z.number().int().nonnegative(),
});
export type SuggestionHistoryEntry = z.infer<typeof SuggestionHistoryEntrySchema>;
