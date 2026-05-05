import { describe, it, expect } from "vitest";
import { slugify, uniqueSlug } from "./slug";

describe("slugify", () => {
  it("converts pure ASCII title", () => {
    expect(slugify("Python For Investing")).toBe("python-for-investing");
  });

  it("converts mixed Thai + English", () => {
    expect(slugify("Python สำหรับการลงทุน")).toMatch(/^python-/);
  });

  it("converts pure Thai", () => {
    expect(slugify("การลงทุน")).toMatch(/^[a-z0-9-]+$/);
    expect(slugify("การลงทุน").length).toBeGreaterThan(0);
  });

  it("strips emoji + special chars", () => {
    expect(slugify("Hello 🎉 World!!!")).toBe("hello-world");
  });

  it("collapses repeated separators", () => {
    expect(slugify("a -- b___c")).toBe("a-b-c");
  });

  it("returns 'untitled' for empty/symbol-only input", () => {
    expect(slugify("")).toBe("untitled");
    expect(slugify("---")).toBe("untitled");
    expect(slugify("!!!")).toBe("untitled");
  });

  it("converts Thai digits", () => {
    expect(slugify("คอร์ส ๒๕๖๘")).toContain("2568");
  });

  it("limits length to 80 chars", () => {
    const long = "a".repeat(200);
    expect(slugify(long).length).toBeLessThanOrEqual(80);
  });
});

describe("uniqueSlug", () => {
  it("returns base when not taken", () => {
    expect(uniqueSlug("hello world", new Set())).toBe("hello-world");
  });

  it("appends -2 on first collision", () => {
    expect(uniqueSlug("hello", new Set(["hello"]))).toBe("hello-2");
  });

  it("walks numbers until free", () => {
    expect(uniqueSlug("hello", new Set(["hello", "hello-2", "hello-3"]))).toBe(
      "hello-4",
    );
  });
});
