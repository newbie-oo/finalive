import { describe, it, expect, vi, beforeAll } from "vitest";

vi.mock("server-only", () => ({}));

beforeAll(() => {
  process.env.S3_ENDPOINT ??= "http://localhost:9000";
  process.env.S3_REGION ??= "auto";
  process.env.S3_ACCESS_KEY_ID ??= "k";
  process.env.S3_SECRET_ACCESS_KEY ??= "s";
  process.env.S3_BUCKET_PRIVATE ??= "private";
  process.env.S3_BUCKET_PUBLIC ??= "public";
  process.env.S3_PUBLIC_BASE_URL ??= "http://localhost:9000/public";
  process.env.DATABASE_URL ??= "postgres://x:x@localhost:5432/x";
  process.env.BETTER_AUTH_SECRET ??= "test-secret-min-16-chars-long-xx";
  process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
  process.env.SMTP_HOST ??= "localhost";
  process.env.SMTP_PORT ??= "1025";
  process.env.EMAIL_FROM ??= "test@example.com";
});

describe("publicUrl", () => {
  it("joins base url + key, encoding the key path", async () => {
    const { publicUrl } = await import("./r2");
    expect(publicUrl("certs/abc.pdf")).toBe("http://localhost:9000/public/certs/abc.pdf");
    expect(publicUrl("path with space.png")).toContain("path%20with%20space.png");
  });

  it("strips trailing slash from base url", async () => {
    process.env.S3_PUBLIC_BASE_URL = "http://localhost:9000/public/";
    const fresh = await import("./r2");
    expect(fresh.publicUrl("a.png").startsWith("http://localhost:9000/public/")).toBe(true);
    expect(fresh.publicUrl("a.png")).not.toContain("//a.png");
  });
});
