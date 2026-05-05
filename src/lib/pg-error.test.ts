import { describe, it, expect } from "vitest";
import { asPgError, isUniqueViolation } from "./pg-error";

describe("asPgError", () => {
  it("returns null for non-PG errors", () => {
    expect(asPgError(new Error("plain"))).toBeNull();
    expect(asPgError(null)).toBeNull();
    expect(asPgError("string")).toBeNull();
  });

  it("extracts code + constraint_name", () => {
    const fakeErr = Object.assign(new Error("dup"), {
      code: "23505",
      constraint_name: "user_email_unique",
    });
    expect(asPgError(fakeErr)).toEqual({
      code: "23505",
      constraint_name: "user_email_unique",
    });
  });
});

describe("isUniqueViolation", () => {
  it("matches by SQLSTATE 23505", () => {
    const fakeErr = Object.assign(new Error(""), { code: "23505" });
    expect(isUniqueViolation(fakeErr)).toBe(true);
  });

  it("optionally narrows by constraint name", () => {
    const e = Object.assign(new Error(""), {
      code: "23505",
      constraint_name: "one_active_pending",
    });
    expect(isUniqueViolation(e, "one_active_pending")).toBe(true);
    expect(isUniqueViolation(e, "another_constraint")).toBe(false);
  });

  it("returns false for non-unique errors", () => {
    expect(isUniqueViolation(new Error("plain"))).toBe(false);
    expect(
      isUniqueViolation(Object.assign(new Error(""), { code: "23503" })),
    ).toBe(false);
  });
});
