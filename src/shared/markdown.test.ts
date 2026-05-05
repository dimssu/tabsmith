import { describe, it, expect } from "vitest";
import { renderMarkdown } from "./markdown";

describe("renderMarkdown", () => {
  it("escapes HTML to prevent injection", () => {
    const out = renderMarkdown("<script>alert(1)</script>");
    expect(out).not.toContain("<script>");
    expect(out).toContain("&lt;script&gt;");
  });

  it("renders headings", () => {
    expect(renderMarkdown("# Heading")).toContain("<h1");
    expect(renderMarkdown("## Sub")).toContain("<h2");
    expect(renderMarkdown("### Tiny")).toContain("<h3");
  });

  it("renders bold and italic", () => {
    const out = renderMarkdown("This is **bold** and *italic*.");
    expect(out).toContain("<strong>bold</strong>");
    expect(out).toContain("<em>italic</em>");
  });

  it("renders inline code without re-escaping", () => {
    const out = renderMarkdown("call `fn(<x>)`");
    expect(out).toContain("<code");
    expect(out).toContain("fn(&lt;x&gt;)");
  });

  it("auto-links bare http urls", () => {
    const out = renderMarkdown("see https://example.com here");
    expect(out).toContain('href="https://example.com"');
  });

  it("rejects javascript: urls in [text](url) links", () => {
    const out = renderMarkdown("[click](javascript:alert(1))");
    // The link should be left as-is escaped text, never an <a href>
    expect(out).not.toContain('href="javascript:');
  });

  it("renders unordered lists", () => {
    const out = renderMarkdown("- one\n- two");
    expect(out).toMatch(/<ul[^>]*>.*<li[^>]*>one<\/li>.*<li[^>]*>two<\/li>.*<\/ul>/s);
  });

  it("renders ordered lists", () => {
    const out = renderMarkdown("1. first\n2. second");
    expect(out).toMatch(/<ol[^>]*>.*<li[^>]*>first<\/li>/s);
  });

  it("renders horizontal rules", () => {
    expect(renderMarkdown("---")).toContain("<hr");
  });

  it("returns empty string for empty input", () => {
    expect(renderMarkdown("")).toBe("");
    expect(renderMarkdown("   ")).toBe("");
  });
});
