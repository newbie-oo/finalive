import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import sharp from "sharp";
import { NextRequest, NextResponse } from "next/server";

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

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ db: {}, schema: {} }));
vi.mock("@/server/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));

const {
  requireSessionThrow,
  requireRoleThrow,
  createImageUploadService,
  runImageUpload,
} = vi.hoisted(() => ({
  requireSessionThrow: vi.fn(),
  requireRoleThrow: vi.fn(),
  createImageUploadService: vi.fn(),
  runImageUpload: vi.fn(),
}));
vi.mock("@/server/auth-session", () => ({
  requireSessionThrow,
  requireRoleThrow,
}));
vi.mock("@/server/services/image-upload-factory", () => ({
  createImageUploadService,
  runImageUpload,
}));

describe("sharp image processing", () => {
  it("resizes large input to 640x360 WebP cover", async () => {
    // Create a 1920x1080 test image.
    const input = await sharp({
      create: {
        width: 1920,
        height: 1080,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
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
      create: {
        width: 1920,
        height: 1080,
        channels: 3,
        background: { r: 0, g: 255, b: 0 },
      },
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

const USER = {
  id: "u1",
  email: "u1@x.com",
  name: "U1",
  role: "user",
  emailVerified: true,
};

function makeReq(): NextRequest {
  return new NextRequest("http://localhost:3000/api/upload/image", {
    method: "POST",
    body: new FormData(),
  });
}

describe("POST /api/upload/image", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireSessionThrow.mockResolvedValue({ sessionId: "s1", user: USER });
  });

  it("delegates to runImageUpload with logPrefix='Image'", async () => {
    const { POST } = await import("./route");
    runImageUpload.mockResolvedValue(
      NextResponse.json({
        mediaAssetId: "m1",
        urls: { cover: "https://c", og: "https://o" },
      }),
    );

    const res = await POST(makeReq());

    expect(res.status).toBe(200);
    expect(runImageUpload).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ id: "u1" }),
      expect.objectContaining({ logPrefix: "Image" }),
    );
  });

  it("returns 401 without session", async () => {
    const { POST } = await import("./route");
    const { ApiError } = await import("@/lib/api-error");
    requireSessionThrow.mockRejectedValueOnce(
      new ApiError("unauthorized", "login required"),
    );

    const res = await POST(makeReq());

    expect(res.status).toBe(401);
    expect(runImageUpload).not.toHaveBeenCalled();
  });
});
