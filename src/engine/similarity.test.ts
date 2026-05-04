import { describe, it, expect } from "vitest";
import { signatureFor } from "./signature";
import { combine, scoreAgainstGroup, rankGroups, scoreSignaturePair, WEIGHTS } from "./similarity";
import type { GroupMeta } from "@/types";

const ts = (id: number, url: string, title: string) =>
  signatureFor({ id, url, title });

const groupMeta = (
  groupId: number,
  domainSeed: string,
  tokens: string[],
  title = "",
): GroupMeta => ({
  groupId,
  title,
  domainSeed,
  tokenSignature: tokens,
  memberCount: 1,
  createdAt: 0,
  updatedAt: 0,
});

describe("combine", () => {
  it("applies weights correctly", () => {
    expect(combine({ domain: 1, path: 0, title: 0 })).toBeCloseTo(WEIGHTS.domain);
    expect(combine({ domain: 0, path: 1, title: 0 })).toBeCloseTo(WEIGHTS.path);
    expect(combine({ domain: 0, path: 0, title: 1 })).toBeCloseTo(WEIGHTS.title);
    expect(combine({ domain: 1, path: 1, title: 1 })).toBeCloseTo(1);
  });
});

describe("scoreSignaturePair", () => {
  it("rewards same domain", () => {
    const a = ts(1, "https://github.com/a/b", "react app");
    const b = ts(2, "https://github.com/c/d", "vue app");
    const score = scoreSignaturePair(a, b).score;
    expect(score).toBeGreaterThan(0.4);
  });

  it("returns lower score across unrelated domains", () => {
    const a = ts(1, "https://github.com/foo", "Pull Requests");
    const b = ts(2, "https://news.ycombinator.com/news", "Hacker News");
    expect(scoreSignaturePair(a, b).score).toBeLessThan(0.2);
  });
});

describe("scoreAgainstGroup", () => {
  it("matches a github tab to a github group", () => {
    const sig = signatureFor({
      id: 1,
      url: "https://github.com/facebook/react/issues",
      title: "Issues · facebook/react",
    });
    const meta = groupMeta(10, "github.com", ["facebook", "react", "pulls", "issues"]);
    const result = scoreAgainstGroup(sig, meta);
    expect(result.score).toBeGreaterThan(0.55);
    expect(result.breakdown.domain).toBe(1);
  });

  it("returns lower score for tabs in other domains", () => {
    const sig = signatureFor({
      id: 1,
      url: "https://news.ycombinator.com/item?id=1",
      title: "Random news item",
    });
    const meta = groupMeta(10, "github.com", ["facebook", "react"]);
    expect(scoreAgainstGroup(sig, meta).score).toBeLessThan(0.5);
  });
});

describe("rankGroups", () => {
  it("orders groups by score descending", () => {
    const sig = signatureFor({
      id: 1,
      url: "https://github.com/foo/bar",
      title: "foo bar repo",
    });
    const groups: GroupMeta[] = [
      groupMeta(10, "news.ycombinator.com", ["news", "ycombinator"]),
      groupMeta(20, "github.com", ["foo", "bar"]),
      groupMeta(30, "stackoverflow.com", ["typescript"]),
    ];
    const ranked = rankGroups(sig, groups);
    expect(ranked[0].candidate.groupId).toBe(20);
  });

  it("returns empty array for empty input", () => {
    const sig = signatureFor({ id: 1, url: "https://x.com", title: "" });
    expect(rankGroups(sig, [])).toEqual([]);
  });
});
