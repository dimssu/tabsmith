import { describe, it, expect } from "vitest";
import { scoreMatch, rankAll } from "./search";

describe("scoreMatch", () => {
  it("returns 0 for empty query", () => {
    expect(scoreMatch("", { title: "anything", url: "x" })).toBe(0);
  });

  it("returns 0 when no haystack contains the query", () => {
    expect(scoreMatch("zebra", { title: "react docs", url: "react.dev" })).toBe(0);
  });

  it("rewards title prefix matches more than substring matches", () => {
    const prefix = scoreMatch("react", { title: "react hooks", url: "x.com" });
    const substring = scoreMatch("react", {
      title: "intro to react hooks",
      url: "x.com",
    });
    expect(prefix).toBeGreaterThan(substring);
  });

  it("requires every query token to appear somewhere", () => {
    expect(
      scoreMatch("react server components", {
        title: "react basics",
        url: "x.com",
      }),
    ).toBe(0);
  });

  it("matches against URL when title doesn't contain the query", () => {
    expect(
      scoreMatch("github", { title: "Pull requests", url: "https://github.com" }),
    ).toBeGreaterThan(0);
  });

  it("matches against body for notes", () => {
    expect(
      scoreMatch("ownership", {
        title: "rust", url: "x.com",
        body: "borrow checker is about ownership",
      }),
    ).toBeGreaterThan(0);
  });
});

describe("rankAll", () => {
  it("orders by descending score and respects the limit", () => {
    const items = [
      { title: "react hooks", url: "x.com" },
      { title: "react", url: "x.com" },
      { title: "intro to react", url: "x.com" },
      { title: "vue", url: "x.com" },
    ];
    const ranked = rankAll("react", items, 2);
    expect(ranked.length).toBe(2);
    expect(ranked[0].item.title).toBe("react");
  });

  it("excludes zero-score items", () => {
    const items = [
      { title: "react", url: "x.com" },
      { title: "vue", url: "x.com" },
    ];
    const ranked = rankAll("react", items);
    expect(ranked.length).toBe(1);
    expect(ranked[0].item.title).toBe("react");
  });
});
