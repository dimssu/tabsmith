import { describe, it, expect } from "vitest";
import {
  normalizeUrl,
  extractDomain,
  registrableDomain,
  pathSegments,
} from "./url";

describe("normalizeUrl", () => {
  it("lowercases scheme and host, drops www", () => {
    expect(normalizeUrl("HTTPS://Www.Example.COM/Path")).toBe(
      "https://example.com/Path",
    );
  });

  it("strips utm_* and known tracking params", () => {
    const u = "https://example.com/x?utm_source=a&utm_medium=b&id=42&gclid=zz";
    expect(normalizeUrl(u)).toBe("https://example.com/x?id=42");
  });

  it("removes trailing slash on non-root paths", () => {
    expect(normalizeUrl("https://example.com/foo/")).toBe(
      "https://example.com/foo",
    );
    expect(normalizeUrl("https://example.com/")).toBe("https://example.com/");
  });

  it("collapses duplicate slashes", () => {
    expect(normalizeUrl("https://example.com//a///b")).toBe(
      "https://example.com/a/b",
    );
  });

  it("drops fragment for non-SPA hosts", () => {
    expect(normalizeUrl("https://example.com/x#section")).toBe(
      "https://example.com/x",
    );
  });

  it("preserves fragment for known SPA hosts", () => {
    expect(
      normalizeUrl("https://docs.google.com/document/d/abc/edit#heading=h.x"),
    ).toBe("https://docs.google.com/document/d/abc/edit#heading=h.x");
  });

  it("returns empty for nullish input", () => {
    expect(normalizeUrl(undefined)).toBe("");
    expect(normalizeUrl(null)).toBe("");
    expect(normalizeUrl("")).toBe("");
  });

  it("survives malformed urls", () => {
    expect(normalizeUrl("not a url")).toBe("not a url");
  });

  it("handles non-http schemes by lowercasing only", () => {
    expect(normalizeUrl("CHROME://Extensions")).toBe("chrome://extensions");
  });
});

describe("extractDomain", () => {
  it("returns hostname without www", () => {
    expect(extractDomain("https://www.github.com/foo")).toBe("github.com");
  });
  it("returns empty for malformed urls", () => {
    expect(extractDomain("not a url")).toBe("");
  });
});

describe("registrableDomain", () => {
  it("collapses subdomains to eTLD+1 in the simple case", () => {
    expect(registrableDomain("docs.api.github.com")).toBe("github.com");
  });
  it("handles compound TLDs like co.uk", () => {
    expect(registrableDomain("foo.bar.co.uk")).toBe("bar.co.uk");
  });
  it("returns the host unchanged when it has two labels", () => {
    expect(registrableDomain("github.com")).toBe("github.com");
  });
});

describe("pathSegments", () => {
  it("splits path and lowercases", () => {
    expect(pathSegments("https://example.com/Foo/Bar/")).toEqual(["foo", "bar"]);
  });
  it("returns empty for empty path", () => {
    expect(pathSegments("https://example.com/")).toEqual([]);
  });
});
