import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";

beforeAll(() => {
	process.env.BETTER_AUTH_SECRET ??= "test-secret-min-16-chars-long-xx";
	process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
	process.env.DATABASE_URL ??= "postgres://x:x@localhost:5432/x";
});

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ db: {}, schema: {} }));
vi.mock("@/server/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));

const {
	requireSessionThrow,
	requireRoleThrow,
	getEnv,
	syncBunnyStatus,
} = vi.hoisted(() => ({
	requireSessionThrow: vi.fn(),
	requireRoleThrow: vi.fn(),
	getEnv: vi.fn(),
	syncBunnyStatus: vi.fn(),
}));
vi.mock("@/server/auth-session", () => ({
	requireSessionThrow,
	requireRoleThrow,
}));
vi.mock("@/lib/env", () => ({ getEnv }));
vi.mock("@/server/container", () => ({
	container: { bunnyStatus: () => ({ sync: syncBunnyStatus }) },
}));

import { GET } from "./route";
import { _resetRateLimitForTests } from "@/lib/rate-limit";

const ADMIN = {
	id: "admin1",
	email: "admin@x.com",
	name: "Admin",
	role: "admin",
	emailVerified: true,
};

const fetchMock = vi.fn();
beforeEach(() => {
	_resetRateLimitForTests();
	vi.clearAllMocks();
	requireRoleThrow.mockResolvedValue({ sessionId: "s1", user: ADMIN });
	getEnv.mockReturnValue({
		BUNNY_LIBRARY_ID: "lib-1",
		BUNNY_API_KEY: "key-1",
	});
	vi.stubGlobal("fetch", fetchMock);
});

function makeReq(qs: string): NextRequest {
	return new NextRequest(
		`http://localhost:3000/api/admin/video-status?${qs}`,
	);
}

describe("GET /api/admin/video-status", () => {
	it("returns formatted status and triggers sync when ready (status=4)", async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({
				guid: "video-1",
				title: "My Video",
				status: 4,
				length: 122.6,
			}),
		});
		syncBunnyStatus.mockResolvedValue({ changed: true });

		const res = await GET(makeReq("videoId=video-1"));

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.videoId).toBe("video-1");
		expect(body.isReady).toBe(true);
		expect(body.durationSeconds).toBe(123);
		expect(body.statusCode).toBe(4);
		expect(syncBunnyStatus).toHaveBeenCalledWith("video-1", 4, 123);
	});

	it("does not sync for non-ready states", async () => {
		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({
				guid: "video-1",
				title: "My Video",
				status: 1,
			}),
		});

		const res = await GET(makeReq("videoId=video-1"));

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.isReady).toBe(false);
		expect(syncBunnyStatus).not.toHaveBeenCalled();
	});

	it("returns Bunny-not-configured error when env missing", async () => {
		getEnv.mockReturnValue({
			BUNNY_LIBRARY_ID: "",
			BUNNY_API_KEY: "",
		});

		const res = await GET(makeReq("videoId=video-1"));

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.error).toBe("Bunny not configured");
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("propagates Bunny error responses", async () => {
		fetchMock.mockResolvedValue({
			ok: false,
			status: 502,
			text: async () => "upstream broken",
		});

		const res = await GET(makeReq("videoId=video-1"));

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.error).toContain("502");
	});

	it("rejects missing videoId with 400", async () => {
		const res = await GET(makeReq(""));

		expect(res.status).toBe(400);
	});

	it("rejects non-admin with 403", async () => {
		const { ApiError } = await import("@/lib/api-error");
		requireRoleThrow.mockRejectedValueOnce(
			new ApiError("forbidden", "admin only"),
		);

		const res = await GET(makeReq("videoId=video-1"));

		expect(res.status).toBe(403);
	});
});
