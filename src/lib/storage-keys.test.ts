import { describe, it, expect } from "vitest";
import { COVER_SIZES, coverKey, coverKeys } from "./storage-keys";

describe("coverKey", () => {
  it("builds the canonical cover key for a uuid + size", () => {
    expect(coverKey("abc-123", 640)).toBe("covers/abc-123-640.webp");
    expect(coverKey("abc-123", 1200)).toBe("covers/abc-123-1200.webp");
  });
});

describe("coverKeys", () => {
  it("returns one key per declared size, in order", () => {
    expect(coverKeys("abc-123")).toEqual([
      "covers/abc-123-640.webp",
      "covers/abc-123-1200.webp",
    ]);
  });

  it("matches COVER_SIZES length", () => {
    expect(coverKeys("u").length).toBe(COVER_SIZES.length);
  });
});
