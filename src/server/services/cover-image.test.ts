import { describe, it, expect, vi } from "vitest";
import { CoverImageService } from "./cover-image";

vi.mock("server-only", () => ({}));

function fakeDeps(
	overrides?: Partial<{
		storage: {
			put: ReturnType<typeof vi.fn>;
			delete: ReturnType<typeof vi.fn>;
			urlFor: ReturnType<typeof vi.fn>;
		};
		getMediaAsset: ReturnType<typeof vi.fn>;
		deleteMediaAsset: ReturnType<typeof vi.fn>;
		updateCourseCover: ReturnType<typeof vi.fn>;
	}>,
) {
	return {
		storage: {
			put: vi.fn().mockResolvedValue(undefined),
			delete: vi.fn().mockResolvedValue(undefined),
			urlFor: vi.fn().mockReturnValue("https://example.com/image.webp"),
		},
		getMediaAsset: vi
			.fn()
			.mockResolvedValue({ id: "ma-old", storageKey: "uuid-old" }),
		deleteMediaAsset: vi.fn().mockResolvedValue(undefined),
		updateCourseCover: vi.fn().mockResolvedValue(undefined),
		...overrides,
	};
}

describe("CoverImageService", () => {
	it("replaces cover and deletes old files", async () => {
		const deps = fakeDeps();
		const svc = new CoverImageService(deps);
		await svc.replaceCover({
			courseId: "c1",
			newMediaAssetId: "ma-new",
			oldCoverMediaId: "ma-old",
		});
		expect(deps.storage.delete).toHaveBeenCalledWith(
			"covers/uuid-old-640.webp",
		);
		expect(deps.storage.delete).toHaveBeenCalledWith(
			"covers/uuid-old-1200.webp",
		);
		expect(deps.deleteMediaAsset).toHaveBeenCalledWith("ma-old");
		expect(deps.updateCourseCover).toHaveBeenCalledWith("c1", "ma-new");
	});

	it("skips deletion when no old cover", async () => {
		const deps = fakeDeps();
		const svc = new CoverImageService(deps);
		await svc.replaceCover({
			courseId: "c1",
			newMediaAssetId: "ma-new",
			oldCoverMediaId: null,
		});
		expect(deps.storage.delete).not.toHaveBeenCalled();
		expect(deps.updateCourseCover).toHaveBeenCalledWith("c1", "ma-new");
	});

	it("skips deletion when old asset not found", async () => {
		const deps = fakeDeps({ getMediaAsset: vi.fn().mockResolvedValue(null) });
		const svc = new CoverImageService(deps);
		await svc.replaceCover({
			courseId: "c1",
			newMediaAssetId: "ma-new",
			oldCoverMediaId: "ma-old",
		});
		expect(deps.storage.delete).not.toHaveBeenCalled();
		expect(deps.updateCourseCover).toHaveBeenCalledWith("c1", "ma-new");
	});

	it("swallows storage delete errors gracefully", async () => {
		const deps = fakeDeps({
			storage: {
				put: vi.fn().mockResolvedValue(undefined),
				delete: vi.fn().mockRejectedValue(new Error("network")),
				urlFor: vi.fn().mockReturnValue(""),
			},
		});
		const svc = new CoverImageService(deps);
		await svc.replaceCover({
			courseId: "c1",
			newMediaAssetId: "ma-new",
			oldCoverMediaId: "ma-old",
		});
		expect(deps.deleteMediaAsset).toHaveBeenCalledWith("ma-old");
		expect(deps.updateCourseCover).toHaveBeenCalledWith("c1", "ma-new");
	});
});
