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

  it("strips javascript: URLs from images while keeping safe https sources", () => {
    const safe = html(`<p><img src="https://x.com/y.png" alt="ok" /></p>`);
    expect(safe).toMatch(/<img[^>]+src="https:\/\/x\.com\/y\.png"/);
    expect(safe).toMatch(/alt="ok"/);

    const unsafe = html(`<p><img src="javascript:alert(1)" /></p>`);
    // The src attribute must not survive sanitisation.
    expect(unsafe).not.toMatch(/javascript:/);
  });

  it("preserves Tiptap-authored underline + alignment via data-align", () => {
    const out = html(`<p style="text-align: center"><u>centered underline</u></p>`);
    expect(out).toMatch(/<u>centered underline<\/u>/);
    // Alignment is migrated to a data attribute the prose stylesheet targets,
    // not left as a passthrough inline style.
    expect(out).toMatch(/data-align="center"/);
    expect(out).not.toMatch(/style="text-align/);
  });

  it("strips inline event handlers (onerror) from images", () => {
    const out = html(`<p><img src="https://x.com/y.png" onerror="alert(1)" /></p>`);
    expect(out).not.toMatch(/onerror/);
  });

  it("forces noopener on anchors targeting _blank", () => {
    const out = html(`<p><a href="https://x.com" target="_blank">link</a></p>`);
    expect(out).toMatch(/rel="noopener noreferrer"/);
  });
});
