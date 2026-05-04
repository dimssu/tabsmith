import { describe, it, expect } from "vitest";
import { tokenize, jaccard, cleanTitle } from "./tokens";

describe("cleanTitle", () => {
  it("strips trailing brand suffix when title is long enough", () => {
    expect(cleanTitle("Pull Requests · facebook/react · GitHub")).toMatch(
      /Pull Requests/,
    );
    expect(cleanTitle("Welcome to React Documentation — React")).toMatch(
      /Welcome to React Documentation/,
    );
  });

  it("leaves short titles alone", () => {
    expect(cleanTitle("Foo - Bar")).toBe("Foo - Bar");
  });

  it("drops leading notification counters", () => {
    expect(cleanTitle("(3) Inbox - user@gmail.com")).toMatch(/Inbox/);
  });

  it("returns empty for nullish", () => {
    expect(cleanTitle(undefined)).toBe("");
  });
});

describe("tokenize", () => {
  it("strips stopwords and short tokens", () => {
    const tokens = tokenize("The Best Guide to React Hooks");
    expect(tokens).toContain("best");
    expect(tokens).toContain("guide");
    expect(tokens).toContain("react");
    expect(tokens).toContain("hooks");
    expect(tokens).not.toContain("the");
    expect(tokens).not.toContain("to");
  });

  it("removes bare numbers", () => {
    const tokens = tokenize("Issue 1234 - bug report");
    expect(tokens).not.toContain("1234");
  });

  it("splits on multiple separator types", () => {
    const tokens = tokenize("foo|bar/baz_qux-quux");
    expect(tokens).toEqual(expect.arrayContaining(["foo", "bar", "baz", "qux", "quux"]));
  });

  it("returns empty array for empty input", () => {
    expect(tokenize(undefined)).toEqual([]);
    expect(tokenize("")).toEqual([]);
  });
});

describe("jaccard", () => {
  it("returns 1 for identical sets", () => {
    expect(jaccard(["a", "b"], ["a", "b"])).toBe(1);
  });
  it("returns 0 for disjoint sets", () => {
    expect(jaccard(["a", "b"], ["c", "d"])).toBe(0);
  });
  it("returns intersection/union for overlapping sets", () => {
    expect(jaccard(["a", "b", "c"], ["b", "c", "d"])).toBeCloseTo(2 / 4, 5);
  });
  it("returns 0 for two empty sets", () => {
    expect(jaccard([], [])).toBe(0);
  });
});
