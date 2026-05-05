import { describe, it, expect, vi, beforeAll } from "vitest";

vi.mock("server-only", () => ({}));

beforeAll(() => {
  process.env.BUNNY_LIBRARY_ID ??= "123456";
  process.env.BUNNY_API_KEY ??= "test-api-key";
  process.env.BETTER_AUTH_SECRET ??= "test-secret-min-16-chars-long-xx";
  process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
  process.env.DATABASE_URL ??= "postgres://x:x@localhost:5432/x";
  process.env.SMTP_HOST ??= "localhost";
  process.env.SMTP_PORT ??= "1025";
  process.env.EMAIL_FROM ??= "test@example.com";
  process.env.S3_ENDPOINT ??= "http://localhost:9000";
  process.env.S3_REGION ??= "auto";
  process.env.S3_ACCESS_KEY_ID ??= "k";
  process.env.S3_SECRET_ACCESS_KEY ??= "s";
  process.env.S3_BUCKET_PRIVATE ??= "private";
  process.env.S3_BUCKET_PUBLIC ??= "public";
  process.env.S3_PUBLIC_BASE_URL ??= "http://localhost:9000/public";
  process.env.BUNNY_CDN_HOSTNAME ??= "vz-cf7a0b15-c66.b-cdn.net";
});

import {
  signEmbedToken,
  signHlsToken,
  buildHlsUrl,
  deleteBunnyVideo,
} from "./bunny";

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
    const a = signEmbedToken({
      videoId: "v1",
      expiresAt: 1,
      secretOverride: "s",
    });
    const b = signEmbedToken({
      videoId: "v2",
      expiresAt: 1,
      secretOverride: "s",
    });
    expect(a.token).not.toBe(b.token);
  });

  it("differs when secret changes", () => {
    const a = signEmbedToken({
      videoId: "v",
      expiresAt: 1,
      secretOverride: "s1",
    });
    const b = signEmbedToken({
      videoId: "v",
      expiresAt: 1,
      secretOverride: "s2",
    });
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
    expect(() => signEmbedToken({ videoId: "v" })).toThrow(
      /BUNNY_STREAM_TOKEN_SECRET/,
    );
    if (original !== undefined)
      process.env.BUNNY_STREAM_TOKEN_SECRET = original;
  });
});

describe("signHlsToken", () => {
  it("produces deterministic base64url token with HMAC-SHA256", () => {
    const a = signHlsToken({
      videoId: "video-123",
      expiresAt: 1_700_000_000,
      secretOverride: "cdn-secret",
    });
    const b = signHlsToken({
      videoId: "video-123",
      expiresAt: 1_700_000_000,
      secretOverride: "cdn-secret",
    });
    expect(a.token).toBe(b.token);
    expect(a.expires).toBe(1_700_000_000);
    expect(a.token).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(a.token).not.toContain("=");
  });

  it("differs when videoId changes", () => {
    const a = signHlsToken({
      videoId: "v1",
      expiresAt: 1,
      secretOverride: "s",
    });
    const b = signHlsToken({
      videoId: "v2",
      expiresAt: 1,
      secretOverride: "s",
    });
    expect(a.token).not.toBe(b.token);
  });

  it("differs when path changes (same videoId different expiry)", () => {
    const a = signHlsToken({ videoId: "v", expiresAt: 1, secretOverride: "s" });
    const b = signHlsToken({ videoId: "v", expiresAt: 2, secretOverride: "s" });
    expect(a.token).not.toBe(b.token);
  });

  it("differs when userIp is included", () => {
    const a = signHlsToken({ videoId: "v", expiresAt: 1, secretOverride: "s" });
    const b = signHlsToken({
      videoId: "v",
      expiresAt: 1,
      secretOverride: "s",
      userIp: "1.2.3.4",
    });
    expect(a.token).not.toBe(b.token);
  });

  it("default expiry ~ now + 7200s", () => {
    const before = Math.floor(Date.now() / 1000);
    const r = signHlsToken({ videoId: "v", secretOverride: "s" });
    const after = Math.floor(Date.now() / 1000);
    expect(r.expires).toBeGreaterThanOrEqual(before + 7200);
    expect(r.expires).toBeLessThanOrEqual(after + 7200);
  });

  it("throws when no secret configured", () => {
    const original = process.env.BUNNY_CDN_TOKEN_SECRET;
    delete process.env.BUNNY_CDN_TOKEN_SECRET;
    expect(() => signHlsToken({ videoId: "v" })).toThrow(
      /BUNNY_CDN_TOKEN_SECRET/,
    );
    if (original !== undefined) process.env.BUNNY_CDN_TOKEN_SECRET = original;
  });
});

describe("buildHlsUrl", () => {
  it("returns unsigned URL when no token secret configured", () => {
    const originalSecret = process.env.BUNNY_CDN_TOKEN_SECRET;
    delete process.env.BUNNY_CDN_TOKEN_SECRET;
    const url = buildHlsUrl({ videoId: "abc" });
    expect(url).toBe("https://vz-cf7a0b15-c66.b-cdn.net/abc/playlist.m3u8");
    if (originalSecret !== undefined)
      process.env.BUNNY_CDN_TOKEN_SECRET = originalSecret;
  });

  it("returns signed URL with token + expires query params", () => {
    const originalSecret = process.env.BUNNY_CDN_TOKEN_SECRET;
    process.env.BUNNY_CDN_TOKEN_SECRET = "cdn-secret";
    const url = buildHlsUrl({ videoId: "abc", expiresAt: 1_700_000_000 });
    expect(url).toMatch(
      /^https:\/\/vz-cf7a0b15-c66\.b-cdn\.net\/abc\/playlist\.m3u8\?/,
    );
    expect(url).toContain("token=");
    expect(url).toContain("expires=1700000000");
    if (originalSecret !== undefined)
      process.env.BUNNY_CDN_TOKEN_SECRET = originalSecret;
  });
});

describe("deleteBunnyVideo", () => {
  it("sends DELETE to Bunny API with correct endpoint", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));

    await deleteBunnyVideo("old-video-guid");

    const call = fetchSpy.mock.calls[0]!;
    expect(call[0]).toMatch(/\/library\/\d+\/videos\/old-video-guid/);
    expect(call[1]).toMatchObject({ method: "DELETE" });
    expect(call[1]?.headers).toMatchObject({ AccessKey: expect.any(String) });

    fetchSpy.mockRestore();
  });

  it("does not throw on 404 (already deleted)", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response(null, { status: 404 }));

    await expect(deleteBunnyVideo("missing-guid")).resolves.not.toThrow();

    fetchSpy.mockRestore();
  });

  it("throws on non-404 error", async () => {
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValue(new Response("Forbidden", { status: 403 }));

    await expect(deleteBunnyVideo("error-guid")).rejects.toThrow(
      /Bunny delete video failed/,
    );

    fetchSpy.mockRestore();
  });
});
