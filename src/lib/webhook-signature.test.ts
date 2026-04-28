import { describe, it, expect } from "vitest";
import { signHmacSha256, verifyHmacSha256 } from "./webhook-signature";

describe("verifyHmacSha256", () => {
  const secret = "test-secret-1234";
  const body = JSON.stringify({ Status: 1, VideoGuid: "abc" });

  it("accepts a correctly signed payload", () => {
    const sig = signHmacSha256(body, secret);
    expect(verifyHmacSha256(body, sig, secret)).toBe(true);
  });

  it("rejects when signature is missing", () => {
    expect(verifyHmacSha256(body, null, secret)).toBe(false);
    expect(verifyHmacSha256(body, "", secret)).toBe(false);
    expect(verifyHmacSha256(body, undefined, secret)).toBe(false);
  });

  it("rejects when signature is for a different body", () => {
    const sig = signHmacSha256("another body", secret);
    expect(verifyHmacSha256(body, sig, secret)).toBe(false);
  });

  it("rejects when signature is for a different secret", () => {
    const sig = signHmacSha256(body, "other-secret");
    expect(verifyHmacSha256(body, sig, secret)).toBe(false);
  });

  it("rejects malformed hex without throwing", () => {
    expect(verifyHmacSha256(body, "zz-not-hex", secret)).toBe(false);
  });

  it("is case-insensitive on the hex input", () => {
    const sig = signHmacSha256(body, secret);
    expect(verifyHmacSha256(body, sig.toUpperCase(), secret)).toBe(true);
  });
});
