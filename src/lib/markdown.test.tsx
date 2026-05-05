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
    const out = html(
      `<p style="text-align: center"><u>centered underline</u></p>`,
    );
    expect(out).toMatch(/<u>centered underline<\/u>/);
    // Alignment is migrated to a data attribute the prose stylesheet targets,
    // not left as a passthrough inline style.
    expect(out).toMatch(/data-align="center"/);
    expect(out).not.toMatch(/style="text-align/);
  });

  it("strips inline event handlers (onerror) from images", () => {
    const out = html(
      `<p><img src="https://x.com/y.png" onerror="alert(1)" /></p>`,
    );
    expect(out).not.toMatch(/onerror/);
  });

  it("forces noopener on anchors targeting _blank", () => {
    const out = html(`<p><a href="https://x.com" target="_blank">link</a></p>`);
    expect(out).toMatch(/rel="noopener noreferrer"/);
  });

  // End-to-end smoke for what the admin Tiptap editor actually emits — a
  // mix of headings, formatted paragraphs, image, alignment, list, link,
  // code block. Renders the same HTML the student sees on /learn.
  it("renders a full Tiptap-style lesson body unchanged in shape", () => {
    const tiptapOutput = [
      `<h2>หัวข้อหลัก</h2>`,
      `<p>ย่อหน้าธรรมดาที่มี <strong>ตัวหนา</strong>, <em>ตัวเอียง</em> และ <u>ขีดเส้นใต้</u>.</p>`,
      `<p style="text-align: center"><img src="https://cdn.example.com/diagram.png" alt="แผนภาพ" width="640" /></p>`,
      `<ul><li>ข้อหนึ่ง</li><li>ข้อสอง</li></ul>`,
      `<blockquote><p>“อ้างคำพูด”</p></blockquote>`,
      `<pre><code>const x = 1;</code></pre>`,
      `<p>อ่านเพิ่มที่ <a href="https://example.com" target="_blank" rel="noopener noreferrer">ลิงก์</a></p>`,
    ].join("");
    const out = html(tiptapOutput);
    // Every non-script feature should survive in some recognisable form.
    expect(out).toMatch(/<h2>หัวข้อหลัก<\/h2>/);
    expect(out).toMatch(/<strong>ตัวหนา<\/strong>/);
    expect(out).toMatch(/<em>ตัวเอียง<\/em>/);
    expect(out).toMatch(/<u>ขีดเส้นใต้<\/u>/);
    expect(out).toMatch(
      /<img[^>]+src="https:\/\/cdn\.example\.com\/diagram\.png"/,
    );
    expect(out).toMatch(/data-align="center"/);
    expect(out).toMatch(/<li>ข้อหนึ่ง<\/li>/);
    expect(out).toMatch(/<blockquote><p>/);
    expect(out).toMatch(/<pre><code>const x = 1;<\/code><\/pre>/);
    expect(out).toMatch(/href="https:\/\/example\.com"/);
    expect(out).toMatch(/rel="noopener noreferrer"/);
    // Should not leak inline style or unknown attrs.
    expect(out).not.toMatch(/style="/);
  });
});
