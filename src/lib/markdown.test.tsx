import { describe, it, expect } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownView } from "./markdown";

function html(md: string): string {
  return renderToStaticMarkup(<MarkdownView text={md} />);
}

describe("MarkdownView", () => {
  it("renders headings, paragraphs, blockquotes, lists", () => {
    const out = html(
      [
        "# Hello",
        "",
        "## Sub",
        "",
        "Paragraph with **bold** and *em* and `code`.",
        "",
        "> a quote",
        "",
        "- one",
        "- two",
        "",
        "1. first",
        "2. second",
      ].join("\n"),
    );
    // # → h2, ## → h3 (we shift down so the page can own the h1).
    expect(out).toMatch(/<h2>Hello<\/h2>/);
    expect(out).toMatch(/<h3>Sub<\/h3>/);
    expect(out).toMatch(/<strong>bold<\/strong>/);
    expect(out).toMatch(/<em>em<\/em>/);
    expect(out).toMatch(/<code>code<\/code>/);
    expect(out).toMatch(/<blockquote><p>a quote<\/p><\/blockquote>/);
    expect(out).toMatch(/<ul><li>one<\/li><li>two<\/li><\/ul>/);
    expect(out).toMatch(/<ol><li>first<\/li><li>second<\/li><\/ol>/);
  });

  it("escapes HTML so it can't inject script tags", () => {
    const out = html("# <script>alert(1)</script>");
    // The literal characters survive but as text, not active markup.
    expect(out).not.toMatch(/<script>alert/);
    expect(out).toMatch(/&lt;script&gt;|<h2>.*script.*<\/h2>/);
  });
});
