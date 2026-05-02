import { describe, it, expect, vi } from "vitest";
import { BunnyVideoStatusService, bunnyStatusName } from "./bunny-video-status";

vi.mock("server-only", () => ({}));

function fakeDeps(
	overrides?: Partial<{
		findAssetByBunnyId: ReturnType<typeof vi.fn>;
		updateAsset: ReturnType<typeof vi.fn>;
		updateLessonDuration: ReturnType<typeof vi.fn>;
	}>,
) {
	return {
		findAssetByBunnyId: vi.fn().mockResolvedValue({
			id: "asset-1",
			currentStatus: "encoding",
			currentDuration: null,
		}),
		updateAsset: vi.fn().mockResolvedValue(undefined),
		updateLessonDuration: vi.fn().mockResolvedValue(undefined),
		...overrides,
	};
}

describe("bunnyStatusName", () => {
	it("maps known codes", () => {
		expect(bunnyStatusName(0)).toBe("created");
		expect(bunnyStatusName(4)).toBe("finished");
		expect(bunnyStatusName(5)).toBe("error");
	});

	it("returns unknown for unrecognized codes", () => {
		expect(bunnyStatusName(99)).toBe("unknown");
	});
});

describe("BunnyVideoStatusService", () => {
	it("syncs finished + duration", async () => {
		const deps = fakeDeps();
		const svc = new BunnyVideoStatusService(deps);
		const result = await svc.sync("bunny-1", 4, 120);
		expect(result.changed).toBe(true);
		expect(result.newStatus).toBe("ready");
		expect(deps.updateAsset).toHaveBeenCalledWith("asset-1", {
			status: "ready",
			durationSeconds: 120,
		});
		expect(deps.updateLessonDuration).toHaveBeenCalledWith("asset-1", 120);
	});

	it("syncs error status", async () => {
		const deps = fakeDeps();
		const svc = new BunnyVideoStatusService(deps);
		const result = await svc.sync("bunny-1", 5, null);
		expect(result.changed).toBe(true);
		expect(result.newStatus).toBe("failed");
	});

	it("returns unchanged when status already matches", async () => {
		const deps = fakeDeps({
			findAssetByBunnyId: vi.fn().mockResolvedValue({
				id: "asset-1",
				currentStatus: "ready",
				currentDuration: 120,
			}),
		});
		const svc = new BunnyVideoStatusService(deps);
		const result = await svc.sync("bunny-1", 4, 120);
		expect(result.changed).toBe(false);
		expect(deps.updateAsset).not.toHaveBeenCalled();
	});

	it("returns unchanged when asset not found", async () => {
		const deps = fakeDeps({
			findAssetByBunnyId: vi.fn().mockResolvedValue(undefined),
		});
		const svc = new BunnyVideoStatusService(deps);
		const result = await svc.sync("bunny-1", 4, 120);
		expect(result.changed).toBe(false);
	});

	it("ignores non-terminal webhook statuses", async () => {
		const deps = fakeDeps();
		const svc = new BunnyVideoStatusService(deps);
		const result = await svc.sync("bunny-1", 2, null);
		expect(result.changed).toBe(false);
	});
});
