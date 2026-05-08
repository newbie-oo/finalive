import { describe, it, expect } from "vitest";
import { formatTHB, formatDuration, formatDurationAuto } from "./format";

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

describe("formatDurationAuto", () => {
  it("returns minutes when under one hour", () => {
    expect(formatDurationAuto(0)).toEqual({ value: "0", unit: "นาที" });
    expect(formatDurationAuto(59)).toEqual({ value: "0", unit: "นาที" });
    expect(formatDurationAuto(60)).toEqual({ value: "1", unit: "นาที" });
    expect(formatDurationAuto(45 * 60)).toEqual({ value: "45", unit: "นาที" });
    expect(formatDurationAuto(59 * 60 + 30)).toEqual({
      value: "59",
      unit: "นาที",
    });
  });

  it("returns hours with one decimal when at least one hour", () => {
    expect(formatDurationAuto(3600)).toEqual({ value: "1.0", unit: "ชั่วโมง" });
    expect(formatDurationAuto(3600 * 1.5)).toEqual({
      value: "1.5",
      unit: "ชั่วโมง",
    });
    expect(formatDurationAuto(3600 * 4 + 36 * 60)).toEqual({
      value: "4.6",
      unit: "ชั่วโมง",
    });
  });

  it("clamps negative inputs to zero", () => {
    expect(formatDurationAuto(-100)).toEqual({ value: "0", unit: "นาที" });
  });
});
