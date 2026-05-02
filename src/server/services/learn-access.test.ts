import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { checkLessonAccess } from "./learn-access";

describe("checkLessonAccess truth table", () => {
  // prettier-ignore
  const cases: Array<[
    string,
    { isPreview: boolean; isFree: boolean },
    { isFree: boolean },
    boolean, // enrolled
    boolean, // authenticated
    boolean, // expected ok
  ]> = [
    ["preview + no auth",              { isPreview: true, isFree: false }, { isFree: false }, false, false, true],
    ["free lesson + no auth",          { isPreview: false, isFree: true }, { isFree: false }, false, false, true],
    ["free course + no auth",          { isPreview: false, isFree: false }, { isFree: true }, false, false, true],
    ["paid lesson + enrolled",         { isPreview: false, isFree: false }, { isFree: false }, true, true, true],
    ["paid lesson + auth not enrolled", { isPreview: false, isFree: false }, { isFree: false }, false, true, false],
    ["paid lesson + no auth",          { isPreview: false, isFree: false }, { isFree: false }, false, false, false],
    ["preview wins over not enrolled", { isPreview: true, isFree: false }, { isFree: false }, false, true, true],
  ];

  it.each(cases)(
    "%s → ok=%p",
    (_label, lesson, course, enrolled, auth, expectedOk) => {
      const result = checkLessonAccess(lesson, course, enrolled, auth);
      expect(result.ok).toBe(expectedOk);
    },
  );

  it("returns login_required when not authenticated for paid", () => {
    const result = checkLessonAccess(
      { isPreview: false, isFree: false },
      { isFree: false },
      false,
      false,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("login_required");
  });

  it("returns purchase_required when auth but not enrolled", () => {
    const result = checkLessonAccess(
      { isPreview: false, isFree: false },
      { isFree: false },
      false,
      true,
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("purchase_required");
  });

  it("returns ok for admin even when not enrolled", () => {
    const result = checkLessonAccess(
      { isPreview: false, isFree: false },
      { isFree: false },
      false,
      true,
      true,
    );
    expect(result.ok).toBe(true);
  });
});
