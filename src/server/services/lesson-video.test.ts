import { describe, it, expect, vi } from "vitest";
import { LessonVideoService } from "./lesson-video";

vi.mock("server-only", () => ({}));

function fakeBunny(
	overrides?: Partial<{
		createVideo: ReturnType<typeof vi.fn>;
		deleteVideo: ReturnType<typeof vi.fn>;
		uploadUrl: ReturnType<typeof vi.fn>;
	}>,
) {
	return {
		createVideo: vi.fn().mockResolvedValue("bunny-1"),
		deleteVideo: vi.fn().mockResolvedValue(undefined),
		uploadUrl: vi.fn().mockReturnValue("https://upload.example.com/bunny-1"),
		...overrides,
	};
}

function fakeDeps(
	overrides?: Partial<{
		bunny: ReturnType<typeof fakeBunny>;
		getLessonVideoMediaId: ReturnType<typeof vi.fn>;
		createVideoAsset: ReturnType<typeof vi.fn>;
		updateLessonVideo: ReturnType<typeof vi.fn>;
		findAssetByBunnyId: ReturnType<typeof vi.fn>;
		findPreviousVideoMediaId: ReturnType<typeof vi.fn>;
		deleteMediaAsset: ReturnType<typeof vi.fn>;
	}>,
) {
	return {
		bunny: fakeBunny(),
		getLessonVideoMediaId: vi.fn().mockResolvedValue("old-1"),
		createVideoAsset: vi.fn().mockResolvedValue({ id: "asset-1" }),
		updateLessonVideo: vi.fn().mockResolvedValue(undefined),
		findAssetByBunnyId: vi.fn().mockResolvedValue({ id: "asset-1" }),
		findPreviousVideoMediaId: vi.fn().mockResolvedValue("prev-1"),
		deleteMediaAsset: vi.fn().mockResolvedValue(undefined),
		...overrides,
	};
}

describe("LessonVideoService", () => {
	describe("createVideo", () => {
		it("creates bunny video, asset, and links to lesson", async () => {
			const deps = fakeDeps();
			const svc = new LessonVideoService(deps);
			const result = await svc.createVideo({
				lessonId: "l1",
				fileName: "test.mp4",
				userId: "u1",
			});
			expect(result.bunnyVideoId).toBe("bunny-1");
			expect(result.assetId).toBe("asset-1");
			expect(result.uploadUrl).toBe("https://upload.example.com/bunny-1");
			expect(result.oldMediaId).toBe("old-1");
			expect(deps.updateLessonVideo).toHaveBeenCalledWith("l1", "asset-1");
		});

		it("handles lesson with no previous video", async () => {
			const deps = fakeDeps({
				getLessonVideoMediaId: vi.fn().mockResolvedValue(null),
			});
			const svc = new LessonVideoService(deps);
			const result = await svc.createVideo({
				lessonId: "l1",
				fileName: "test.mp4",
				userId: "u1",
			});
			expect(result.oldMediaId).toBeNull();
		});
	});

	describe("cancelVideo", () => {
		it("restores previous video and deletes asset", async () => {
			const deps = fakeDeps();
			const svc = new LessonVideoService(deps);
			const result = await svc.cancelVideo({
				lessonId: "l1",
				bunnyVideoId: "bunny-1",
			});
			expect(result.restoredMediaId).toBe("prev-1");
			expect(deps.bunny.deleteVideo).toHaveBeenCalledWith("bunny-1");
			expect(deps.deleteMediaAsset).toHaveBeenCalledWith("asset-1");
			expect(deps.updateLessonVideo).toHaveBeenCalledWith("l1", "prev-1");
		});

		it("swallows bunny delete errors", async () => {
			const deps = fakeDeps({
				bunny: fakeBunny({
					deleteVideo: vi.fn().mockRejectedValue(new Error("network")),
				}),
			});
			const svc = new LessonVideoService(deps);
			const result = await svc.cancelVideo({
				lessonId: "l1",
				bunnyVideoId: "bunny-1",
			});
			expect(result.restoredMediaId).toBe("prev-1");
		});

		it("returns null when asset not found", async () => {
			const deps = fakeDeps({
				findAssetByBunnyId: vi.fn().mockResolvedValue(null),
			});
			const svc = new LessonVideoService(deps);
			const result = await svc.cancelVideo({
				lessonId: "l1",
				bunnyVideoId: "bunny-1",
			});
			expect(result.restoredMediaId).toBeNull();
			expect(deps.deleteMediaAsset).not.toHaveBeenCalled();
		});
	});
});
