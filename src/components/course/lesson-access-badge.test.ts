import { describe, it, expect } from "vitest";
import { pickLessonBadge } from "./lesson-access-badge";

describe("pickLessonBadge", () => {
  it("preview wins when both flags set", () => {
    expect(pickLessonBadge({ isPreview: true, isFree: true })).toBe("preview");
  });

  it("preview only", () => {
    expect(pickLessonBadge({ isPreview: true, isFree: false })).toBe("preview");
  });

  it("free only", () => {
    expect(pickLessonBadge({ isPreview: false, isFree: true })).toBe("free");
  });

  it("returns null when neither flag set (lock icon will represent it)", () => {
    expect(pickLessonBadge({ isPreview: false, isFree: false })).toBeNull();
  });
});
