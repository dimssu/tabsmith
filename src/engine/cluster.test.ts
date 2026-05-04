import { describe, it, expect } from "vitest";
import { cluster } from "./cluster";
import { suggestNewGroups, fingerprintCluster } from "./suggest";

const tab = (id: number, url: string, title: string) => ({ id, url, title });

describe("cluster", () => {
  it("returns no clusters when below minSize", () => {
    expect(cluster([])).toEqual([]);
    expect(
      cluster([tab(1, "https://github.com/a", "x")], { minSize: 3 }),
    ).toEqual([]);
  });

  it("groups by domain when many tabs share a host", () => {
    const tabs = [
      tab(1, "https://github.com/facebook/react", "React repo"),
      tab(2, "https://github.com/facebook/react/pulls", "Pull requests"),
      tab(3, "https://github.com/vercel/next.js", "Next.js"),
      tab(4, "https://github.com/sveltejs/svelte", "Svelte"),
      tab(5, "https://news.ycombinator.com/news", "Hacker News"),
    ];
    const clusters = cluster(tabs, { minSize: 3 });
    expect(clusters.length).toBeGreaterThanOrEqual(1);
    const githubCluster = clusters.find((c) => c.signature.domain === "github.com");
    expect(githubCluster).toBeDefined();
    expect(githubCluster!.members.length).toBe(4);
    expect(githubCluster!.label).toBe("Github");
  });

  it("ignores chrome:// and non-http urls", () => {
    const tabs = [
      tab(1, "chrome://newtab", "New Tab"),
      tab(2, "about:blank", "Blank"),
      tab(3, "https://example.com/a", "ex a"),
      tab(4, "https://example.com/b", "ex b"),
      tab(5, "https://example.com/c", "ex c"),
    ];
    const clusters = cluster(tabs, { minSize: 3 });
    expect(clusters.length).toBe(1);
    expect(clusters[0].members.every((m) => m.domain === "example.com")).toBe(true);
  });

  it("stable sort: largest cluster first", () => {
    const tabs = [
      tab(1, "https://a.com/1", "a"),
      tab(2, "https://a.com/2", "a"),
      tab(3, "https://a.com/3", "a"),
      tab(4, "https://b.com/1", "b"),
      tab(5, "https://b.com/2", "b"),
      tab(6, "https://b.com/3", "b"),
      tab(7, "https://b.com/4", "b"),
    ];
    const clusters = cluster(tabs, { minSize: 3 });
    expect(clusters[0].signature.domain).toBe("b.com");
  });

  it("respects minSize parameter", () => {
    const tabs = [
      tab(1, "https://x.com/a", "x"),
      tab(2, "https://x.com/b", "x"),
    ];
    expect(cluster(tabs, { minSize: 2 }).length).toBe(1);
    expect(cluster(tabs, { minSize: 3 }).length).toBe(0);
  });
});

describe("suggestNewGroups", () => {
  it("excludes tabs already in a group", () => {
    const tabs = [
      { id: 1, url: "https://x.com/a", title: "x", groupId: 100 },
      { id: 2, url: "https://x.com/b", title: "x", groupId: 100 },
      { id: 3, url: "https://x.com/c", title: "x", groupId: 100 },
      { id: 4, url: "https://y.com/a", title: "y" },
      { id: 5, url: "https://y.com/b", title: "y" },
      { id: 6, url: "https://y.com/c", title: "y" },
    ];
    const suggestions = suggestNewGroups(tabs, { minSize: 3 });
    const allSuggestedTabIds = suggestions.flatMap((s) =>
      s.cluster.members.map((m) => m.tabId),
    );
    expect(allSuggestedTabIds).not.toContain(1);
    expect(allSuggestedTabIds).toContain(4);
  });

  it("treats groupId === -1 as ungrouped", () => {
    const tabs = [
      { id: 1, url: "https://z.com/a", title: "z", groupId: -1 },
      { id: 2, url: "https://z.com/b", title: "z", groupId: -1 },
      { id: 3, url: "https://z.com/c", title: "z", groupId: -1 },
    ];
    expect(suggestNewGroups(tabs, { minSize: 3 }).length).toBe(1);
  });
});

describe("fingerprintCluster", () => {
  it("produces a stable id for the same membership regardless of order", () => {
    const tabs = [
      tab(3, "https://x.com/c", "c"),
      tab(1, "https://x.com/a", "a"),
      tab(2, "https://x.com/b", "b"),
    ];
    const tabs2 = [
      tab(1, "https://x.com/a", "a"),
      tab(2, "https://x.com/b", "b"),
      tab(3, "https://x.com/c", "c"),
    ];
    const a = cluster(tabs, { minSize: 3 })[0];
    const b = cluster(tabs2, { minSize: 3 })[0];
    expect(fingerprintCluster(a)).toBe(fingerprintCluster(b));
  });
});
