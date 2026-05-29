import { describe, it, expect } from "vitest";
import { formatMinutes, minutesFromInput, unitForMinutes } from "./snooze";

describe("formatMinutes", () => {
  it("handles sub-minute values", () => {
    expect(formatMinutes(0.5)).toBe("30s");
  });
  it("handles minutes", () => {
    expect(formatMinutes(15)).toBe("15m");
  });
  it("handles hours with leftover minutes", () => {
    expect(formatMinutes(90)).toBe("1h 30m");
  });
  it("handles whole hours", () => {
    expect(formatMinutes(120)).toBe("2h");
  });
  it("handles days", () => {
    expect(formatMinutes(60 * 24)).toBe("1d");
    expect(formatMinutes(60 * 24 + 60)).toBe("1d 1h");
  });
  it("handles weeks", () => {
    expect(formatMinutes(60 * 24 * 7)).toBe("1w");
  });
  it("returns 'now' for zero or negative", () => {
    expect(formatMinutes(0)).toBe("now");
    expect(formatMinutes(-5)).toBe("now");
  });
});

describe("minutesFromInput", () => {
  it("converts each unit", () => {
    expect(minutesFromInput(3, "minutes")).toBe(3);
    expect(minutesFromInput(2, "hours")).toBe(120);
    expect(minutesFromInput(1, "days")).toBe(60 * 24);
    expect(minutesFromInput(1, "weeks")).toBe(60 * 24 * 7);
  });
  it("rejects non-positive values", () => {
    expect(minutesFromInput(0, "minutes")).toBeNull();
    expect(minutesFromInput(-5, "hours")).toBeNull();
  });
  it("rejects values that exceed one year", () => {
    expect(minutesFromInput(366, "days")).toBeNull();
  });
});

describe("unitForMinutes", () => {
  it("picks the largest exact unit", () => {
    expect(unitForMinutes(60)).toEqual({ value: 1, unit: "hours" });
    expect(unitForMinutes(120)).toEqual({ value: 2, unit: "hours" });
    expect(unitForMinutes(60 * 24)).toEqual({ value: 1, unit: "days" });
    expect(unitForMinutes(60 * 24 * 7)).toEqual({ value: 1, unit: "weeks" });
  });
  it("falls back to minutes for non-integer hours", () => {
    expect(unitForMinutes(90)).toEqual({ value: 90, unit: "minutes" });
  });
});
