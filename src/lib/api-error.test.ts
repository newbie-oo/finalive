import { describe, it, expect } from "vitest";
import { ApiError, statusForCode } from "./api-error";
import { thaiErrorMessage } from "./error-messages";

describe("ApiError", () => {
  it("uses code as message when none provided", () => {
    const e = new ApiError("not_found");
    expect(e.code).toBe("not_found");
    expect(e.message).toBe("not_found");
  });

  it("toResponse omits details when undefined", () => {
    const e = new ApiError("forbidden", "nope");
    expect(e.toResponse("req-1")).toEqual({
      code: "forbidden",
      message: "nope",
      request_id: "req-1",
    });
  });

  it("toResponse includes details when provided", () => {
    const e = new ApiError("validation_failed", "bad", { email: "required" });
    expect(e.toResponse("req-2").details).toEqual({ email: "required" });
  });
});

describe("statusForCode", () => {
  it("maps known codes", () => {
    expect(statusForCode("unauthorized")).toBe(401);
    expect(statusForCode("forbidden")).toBe(403);
    expect(statusForCode("rate_limited")).toBe(429);
    expect(statusForCode("internal_error")).toBe(500);
  });
});

describe("thaiErrorMessage", () => {
  it("returns Thai messages for all codes", () => {
    expect(thaiErrorMessage("unauthorized")).toMatch(/เข้าสู่ระบบ/);
    expect(thaiErrorMessage("not_found")).toMatch(/ไม่พบ/);
  });
});
