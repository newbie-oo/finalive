import { describe, it, expect, beforeAll } from "vitest";
import sharp from "sharp";

beforeAll(() => {
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
});

describe("sharp image processing", () => {
  it("resizes large input to 640x360 WebP cover", async () => {
    // Create a 1920x1080 test image.
    const input = await sharp({
      create: { width: 1920, height: 1080, channels: 3, background: { r: 255, g: 0, b: 0 } },
    })
      .png()
      .toBuffer();

    const output = await sharp(input)
      .resize(640, 360, { fit: "cover" })
      .webp({ quality: 80 })
      .toBuffer();

    const meta = await sharp(output).metadata();
    expect(meta.width).toBe(640);
    expect(meta.height).toBe(360);
    expect(meta.format).toBe("webp");
  });

  it("resizes large input to 1200x630 WebP OG image", async () => {
    const input = await sharp({
      create: { width: 1920, height: 1080, channels: 3, background: { r: 0, g: 255, b: 0 } },
    })
      .png()
      .toBuffer();

    const output = await sharp(input)
      .resize(1200, 630, { fit: "cover" })
      .webp({ quality: 80 })
      .toBuffer();

    const meta = await sharp(output).metadata();
    expect(meta.width).toBe(1200);
    expect(meta.height).toBe(630);
    expect(meta.format).toBe("webp");
  });
});
