import { describe, it, expect } from "vitest";
import { formatTHB, formatDuration } from "./format";

describe("formatTHB", () => {
  it("formats numbers as THB currency", () => {
    expect(formatTHB(1290)).toMatch(/1,290/);
    expect(formatTHB(0)).toMatch(/0/);
  });

  it("accepts numeric strings", () => {
    expect(formatTHB("1290.50")).toMatch(/1,290/);
  });

  it("falls back to 0 on non-numeric input", () => {
    expect(formatTHB("not-a-number")).toMatch(/0/);
  });
});

describe("formatDuration", () => {
  it("formats m:ss", () => {
    expect(formatDuration(65)).toBe("1:05");
    expect(formatDuration(600)).toBe("10:00");
  });

  it("returns em-dash for null/zero/negative", () => {
    expect(formatDuration(null)).toBe("—");
    expect(formatDuration(0)).toBe("—");
    expect(formatDuration(-5)).toBe("—");
  });

  it("uses custom fallback when provided", () => {
    expect(formatDuration(null, "")).toBe("");
    expect(formatDuration(0, "")).toBe("");
    expect(formatDuration(undefined as unknown as null, "—")).toBe("—");
  });
});
