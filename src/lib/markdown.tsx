import { Fragment, type ReactNode } from "react";
import DOMPurify from "isomorphic-dompurify";

/**
 * Rich-text / markdown renderer for lesson/quiz body text.
 *
 * Tiptap-authored content is HTML; legacy seed content may still be
 * Markdown. We detect by leading `<` and route accordingly.
 *
 * HTML branch: even though only admins can author lesson bodies, we still
 * sanitize with DOMPurify before rendering — defense in depth in case a
 * compromised admin account or a future API path injects something nasty.
 * The allow-list mirrors what Tiptap's StarterKit produces.
 */
const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "s",
  "code",
  "blockquote",
  "h1",
  "h2",
  "h3",
  "ul",
  "ol",
  "li",
  "a",
  "hr",
  "pre",
];
const ALLOWED_ATTR = ["href", "target", "rel"];

export function sanitizeRichHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Force any user-supplied link to safe defaults.
    ADD_ATTR: ["target"],
  });
}

export function MarkdownView({ text }: { text: string }) {
  const trimmed = text.trim();
  // If the content starts with an HTML tag, render as sanitized HTML
  // (Tiptap output). Otherwise fall back to the legacy markdown parser.
  const looksLikeHtml = /^</.test(trimmed);
  if (looksLikeHtml) {
    return (
      <article
        className="prose prose-sm max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(text) }}
      />
    );
  }

  const blocks = parseBlocks(text);
  return (
    <article className="prose prose-sm max-w-none dark:prose-invert">
      {blocks.map((b, i) => renderBlock(b, i))}
    </article>
  );
}

type Block =
  | { kind: "h"; level: 2 | 3 | 4; text: string }
  | { kind: "p"; text: string }
  | { kind: "blockquote"; text: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "hr" };

function parseBlocks(input: string): Block[] {
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];

  let i = 0;
  while (i < lines.length) {
    const raw = lines[i] ?? "";
    const line = raw.trimEnd();

    if (line.trim() === "") {
      i++;
      continue;
    }
    if (line === "---" || line === "***") {
      blocks.push({ kind: "hr" });
      i++;
      continue;
    }
    const h = /^(#{1,3})\s+(.*)$/.exec(line);
    if (h) {
      // Shift one level down: pages always own h1, so user-authored
      // headings (#, ##, ###) become h2, h3, h4 to keep document outline
      // correct and avoid duplicate h1s competing with the page title.
      const level = Math.min(4, h[1]!.length + 1) as 2 | 3 | 4;
      blocks.push({ kind: "h", level, text: h[2]! });
      i++;
      continue;
    }
    if (line.startsWith("> ")) {
      const buf: string[] = [];
      while (i < lines.length && lines[i]!.startsWith("> ")) {
        buf.push(lines[i]!.slice(2));
        i++;
      }
      blocks.push({ kind: "blockquote", text: buf.join(" ") });
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i] ?? "")) {
        items.push((lines[i] ?? "").replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ul", items });
      continue;
    }
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i] ?? "")) {
        items.push((lines[i] ?? "").replace(/^\s*\d+\.\s+/, ""));
        i++;
      }
      blocks.push({ kind: "ol", items });
      continue;
    }

    // Paragraph: gather consecutive non-empty, non-block lines.
    const buf: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i]!.trim() !== "" &&
      !/^#{1,3}\s/.test(lines[i] ?? "") &&
      !/^>\s/.test(lines[i] ?? "") &&
      !/^\s*[-*]\s+/.test(lines[i] ?? "") &&
      !/^\s*\d+\.\s+/.test(lines[i] ?? "")
    ) {
      buf.push(lines[i] ?? "");
      i++;
    }
    blocks.push({ kind: "p", text: buf.join(" ") });
  }
  return blocks;
}

function renderBlock(b: Block, key: number): ReactNode {
  switch (b.kind) {
    case "hr":
      return <hr key={key} />;
    case "h":
      if (b.level === 2) return <h2 key={key}>{renderInline(b.text)}</h2>;
      if (b.level === 3) return <h3 key={key}>{renderInline(b.text)}</h3>;
      return <h4 key={key}>{renderInline(b.text)}</h4>;
    case "p":
      return <p key={key}>{renderInline(b.text)}</p>;
    case "blockquote":
      return (
        <blockquote key={key}>
          <p>{renderInline(b.text)}</p>
        </blockquote>
      );
    case "ul":
      return (
        <ul key={key}>
          {b.items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ul>
      );
    case "ol":
      return (
        <ol key={key}>
          {b.items.map((item, idx) => (
            <li key={idx}>{renderInline(item)}</li>
          ))}
        </ol>
      );
  }
}

// Inline parser: **bold**, *em*, `code`. Naive but handles the seed bodies.
function renderInline(text: string): ReactNode {
  const tokens: ReactNode[] = [];
  let buf = "";
  let i = 0;
  let key = 0;

  function flushBuf() {
    if (buf) {
      tokens.push(<Fragment key={key++}>{buf}</Fragment>);
      buf = "";
    }
  }

  while (i < text.length) {
    if (text.startsWith("**", i)) {
      const end = text.indexOf("**", i + 2);
      if (end !== -1) {
        flushBuf();
        tokens.push(<strong key={key++}>{text.slice(i + 2, end)}</strong>);
        i = end + 2;
        continue;
      }
    }
    if (text[i] === "*") {
      const end = text.indexOf("*", i + 1);
      if (end !== -1 && end !== i + 1) {
        flushBuf();
        tokens.push(<em key={key++}>{text.slice(i + 1, end)}</em>);
        i = end + 1;
        continue;
      }
    }
    if (text[i] === "`") {
      const end = text.indexOf("`", i + 1);
      if (end !== -1) {
        flushBuf();
        tokens.push(<code key={key++}>{text.slice(i + 1, end)}</code>);
        i = end + 1;
        continue;
      }
    }
    buf += text[i++];
  }
  flushBuf();
  return tokens;
}
