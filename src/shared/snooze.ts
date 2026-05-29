// Shared utilities for snooze presets and custom-duration parsing.
// Lives in shared/ rather than engine/ because the side-panel UI uses it too.

import { DEFAULT_SNOOZE_PRESETS, type SnoozePreset } from "@/types";

export { DEFAULT_SNOOZE_PRESETS };
export type { SnoozePreset };

// Format minutes as a compact human label. Used when the user enters a
// custom number — we display "in 1h 30m" rather than "in 90 minutes".
export function formatMinutes(minutes: number): string {
  if (!isFinite(minutes) || minutes <= 0) return "now";
  if (minutes < 1) return `${Math.round(minutes * 60)}s`;
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const remMin = Math.round(minutes - hours * 60);
  if (hours < 24) {
    return remMin > 0 ? `${hours}h ${remMin}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remHours = hours - days * 24;
  if (days < 7) {
    return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
  }
  const weeks = Math.floor(days / 7);
  const remDays = days - weeks * 7;
  return remDays > 0 ? `${weeks}w ${remDays}d` : `${weeks}w`;
}

export type SnoozeUnit = "minutes" | "hours" | "days" | "weeks";

const UNIT_TO_MINUTES: Record<SnoozeUnit, number> = {
  minutes: 1,
  hours: 60,
  days: 60 * 24,
  weeks: 60 * 24 * 7,
};

// Convert a user-entered (value, unit) into a normalized minute count.
// Returns null on invalid input so callers can guard.
export function minutesFromInput(value: number, unit: SnoozeUnit): number | null {
  if (!isFinite(value) || value <= 0) return null;
  const minutes = value * UNIT_TO_MINUTES[unit];
  if (minutes < 0.1) return null;
  if (minutes > 60 * 24 * 365) return null;
  return minutes;
}

// Pick a reasonable default unit for a given minute count — so when we
// pre-fill the custom field with the user's last value (in minutes) we
// can show it in the unit they most likely typed it in.
export function unitForMinutes(minutes: number): { value: number; unit: SnoozeUnit } {
  if (minutes >= UNIT_TO_MINUTES.weeks && minutes % UNIT_TO_MINUTES.weeks === 0) {
    return { value: minutes / UNIT_TO_MINUTES.weeks, unit: "weeks" };
  }
  if (minutes >= UNIT_TO_MINUTES.days && minutes % UNIT_TO_MINUTES.days === 0) {
    return { value: minutes / UNIT_TO_MINUTES.days, unit: "days" };
  }
  if (minutes >= UNIT_TO_MINUTES.hours && minutes % UNIT_TO_MINUTES.hours === 0) {
    return { value: minutes / UNIT_TO_MINUTES.hours, unit: "hours" };
  }
  return { value: minutes, unit: "minutes" };
}
