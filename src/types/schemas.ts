import { z } from "zod";

export const NoteSchema = z.object({
  url: z.string().min(1),
  body: z.string().default(""),
  createdAt: z.number().int().nonnegative(),
  updatedAt: z.number().int().nonnegative(),
  pinned: z.boolean().default(false),
});
export type Note = z.infer<typeof NoteSchema>;

export const ReminderSchema = z.object({
  id: z.string().min(1),
  url: z.string().min(1),
  titleHint: z.string().optional(),
  fireAt: z.number().int().positive(),
  createdAt: z.number().int().nonnegative(),
  fired: z.boolean().default(false),
  note: z.string().optional(),
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

export const PreferencesSchema = z.object({
  assignThreshold: z.number().min(0).max(1).default(0.55),
  createThreshold: z.number().min(0).max(1).default(0.45),
  minClusterSize: z.number().int().min(2).max(20).default(3),
  notificationsEnabled: z.boolean().default(true),
  idleAnalyzeSeconds: z.number().int().min(10).max(600).default(30),
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
