import { describe, it, expect, vi } from "vitest";
import { ImageUploadService, ImageUploadError } from "./image-upload";

vi.mock("server-only", () => ({}));

function fakeDeps(
  overrides?: Partial<{
    storage: {
      put: ReturnType<typeof vi.fn>;
      urlFor: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    processImage: ReturnType<typeof vi.fn>;
    createMediaAsset: ReturnType<typeof vi.fn>;
    maxSizeBytes: number;
  }>,
) {
  return {
    storage: {
      put: vi.fn().mockResolvedValue(undefined),
      urlFor: vi
        .fn()
        .mockImplementation((key: string) => `https://cdn.example.com/${key}`),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    processImage: vi.fn().mockResolvedValue([
      {
        buffer: Buffer.from("a"),
        key: "covers/uuid-640.webp",
        contentType: "image/webp",
        name: "cover",
      },
      {
        buffer: Buffer.from("b"),
        key: "covers/uuid-1200.webp",
        contentType: "image/webp",
        name: "og",
      },
    ]),
    createMediaAsset: vi.fn().mockResolvedValue({ id: "asset-1" }),
    maxSizeBytes: 5 * 1024 * 1024,
    ...overrides,
  };
}

describe("ImageUploadService", () => {
  it("uploads image and returns asset id + urls", async () => {
    const deps = fakeDeps();
    const svc = new ImageUploadService(deps);
    const result = await svc.upload({
      bytes: Buffer.from("img"),
      userId: "u1",
    });
    expect(result.mediaAssetId).toBe("asset-1");
    expect(result.urls.cover).toBe(
      "https://cdn.example.com/covers/uuid-640.webp",
    );
    expect(result.urls.og).toBe(
      "https://cdn.example.com/covers/uuid-1200.webp",
    );
    expect(deps.storage.put).toHaveBeenCalledTimes(2);
  });

  it("rejects empty files", async () => {
    const deps = fakeDeps();
    const svc = new ImageUploadService(deps);
    await expect(
      svc.upload({ bytes: Buffer.alloc(0), userId: "u1" }),
    ).rejects.toThrow(ImageUploadError);
  });

  it("rejects oversized files", async () => {
    const deps = fakeDeps();
    const svc = new ImageUploadService(deps);
    try {
      await svc.upload({ bytes: Buffer.alloc(6 * 1024 * 1024), userId: "u1" });
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ImageUploadError);
      expect((e as ImageUploadError).code).toBe("file_too_large");
    }
  });

  it("rejects when processing yields no variants", async () => {
    const deps = fakeDeps({ processImage: vi.fn().mockResolvedValue([]) });
    const svc = new ImageUploadService(deps);
    try {
      await svc.upload({ bytes: Buffer.from("img"), userId: "u1" });
      expect.fail("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(ImageUploadError);
      expect((e as ImageUploadError).code).toBe("processing_failed");
    }
  });
});
