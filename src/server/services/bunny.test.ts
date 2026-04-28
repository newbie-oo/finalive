import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { signEmbedToken } from "./bunny";

describe("signEmbedToken", () => {
  it("produces deterministic base64url token + matching expires", () => {
    const a = signEmbedToken({
      videoId: "video-123",
      expiresAt: 1_700_000_000,
      secretOverride: "test-secret",
    });
    const b = signEmbedToken({
      videoId: "video-123",
      expiresAt: 1_700_000_000,
      secretOverride: "test-secret",
    });
    expect(a.token).toBe(b.token);
    expect(a.expires).toBe(1_700_000_000);
    expect(a.token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a.token).not.toContain("=");
    expect(a.token).not.toContain("+");
    expect(a.token).not.toContain("/");
  });

  it("differs when videoId changes", () => {
    const a = signEmbedToken({ videoId: "v1", expiresAt: 1, secretOverride: "s" });
    const b = signEmbedToken({ videoId: "v2", expiresAt: 1, secretOverride: "s" });
    expect(a.token).not.toBe(b.token);
  });

  it("differs when secret changes", () => {
    const a = signEmbedToken({ videoId: "v", expiresAt: 1, secretOverride: "s1" });
    const b = signEmbedToken({ videoId: "v", expiresAt: 1, secretOverride: "s2" });
    expect(a.token).not.toBe(b.token);
  });

  it("default expiry ~ now + 7200s", () => {
    const before = Math.floor(Date.now() / 1000);
    const r = signEmbedToken({ videoId: "v", secretOverride: "s" });
    const after = Math.floor(Date.now() / 1000);
    expect(r.expires).toBeGreaterThanOrEqual(before + 7200);
    expect(r.expires).toBeLessThanOrEqual(after + 7200);
  });

  it("throws when no secret configured", () => {
    const original = process.env.BUNNY_STREAM_TOKEN_SECRET;
    delete process.env.BUNNY_STREAM_TOKEN_SECRET;
    expect(() => signEmbedToken({ videoId: "v" })).toThrow(/BUNNY_STREAM_TOKEN_SECRET/);
    if (original !== undefined) process.env.BUNNY_STREAM_TOKEN_SECRET = original;
  });
});
