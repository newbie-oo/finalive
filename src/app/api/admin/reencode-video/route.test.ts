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
	getCourseOwnerId,
	getCollaboratorRole,
	getLessonVideoAsset,
	setAssetEncoding,
} = vi.hoisted(() => ({
	requireSessionThrow: vi.fn(),
	requireRoleThrow: vi.fn(),
	getEnv: vi.fn(),
	getCourseOwnerId: vi.fn(),
	getCollaboratorRole: vi.fn(),
	getLessonVideoAsset: vi.fn(),
	setAssetEncoding: vi.fn(),
}));
vi.mock("@/server/auth-session", () => ({
	requireSessionThrow,
	requireRoleThrow,
}));
vi.mock("@/lib/env", () => ({ getEnv }));
vi.mock("@/server/repos/course-authz", () => ({
	getCourseOwnerId,
	getCollaboratorRole,
}));
vi.mock("@/server/repos/lesson-video", () => ({
	LessonVideoRepo: { getLessonVideoAsset, setAssetEncoding },
}));

import { POST } from "./route";
import { _resetRateLimitForTests } from "@/lib/rate-limit";

const ADMIN = {
	id: "admin1",
	email: "admin@x.com",
	name: "Admin",
	role: "admin",
	emailVerified: true,
};

const COURSE_ID = "11111111-1111-1111-1111-111111111111";
const LESSON_ID = "22222222-2222-2222-2222-222222222222";

const fetchMock = vi.fn();

function makeReq(body: unknown): NextRequest {
	return new NextRequest(
		"http://localhost:3000/api/admin/reencode-video",
		{
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body),
		},
	);
}

describe("POST /api/admin/reencode-video", () => {
	beforeEach(() => {
		_resetRateLimitForTests();
		vi.clearAllMocks();
		requireRoleThrow.mockResolvedValue({ sessionId: "s1", user: ADMIN });
		getCourseOwnerId.mockResolvedValue("admin1");
		getCollaboratorRole.mockResolvedValue(null);
		getEnv.mockReturnValue({
			BUNNY_LIBRARY_ID: "lib-1",
			BUNNY_API_KEY: "key-1",
		});
		vi.stubGlobal("fetch", fetchMock);
	});

	it("requests reencode and updates asset on success", async () => {
		getLessonVideoAsset.mockResolvedValue({
			assetId: "asset-1",
			bunnyId: "bunny-vid-1",
			storage: "bunny_stream",
		});
		fetchMock.mockResolvedValue({ ok: true });
		setAssetEncoding.mockResolvedValue(undefined);

		const res = await POST(
			makeReq({ lessonId: LESSON_ID, courseId: COURSE_ID }),
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.ok).toBe(true);
		expect(body.bunnyVideoId).toBe("bunny-vid-1");
		expect(setAssetEncoding).toHaveBeenCalledWith("asset-1");
		expect(fetchMock).toHaveBeenCalledWith(
			expect.stringContaining("/lib-1/videos/bunny-vid-1/reencode"),
			expect.objectContaining({ method: "POST" }),
		);
	});

	it("returns 404 when no bunny_stream asset exists", async () => {
		getLessonVideoAsset.mockResolvedValue(null);

		const res = await POST(
			makeReq({ lessonId: LESSON_ID, courseId: COURSE_ID }),
		);

		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.code).toBe("not_found");
		expect(body.request_id).toBeDefined();
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("returns 500 when Bunny env missing", async () => {
		getLessonVideoAsset.mockResolvedValue({
			assetId: "asset-1",
			bunnyId: "bunny-1",
			storage: "bunny_stream",
		});
		getEnv.mockReturnValue({
			BUNNY_LIBRARY_ID: "",
			BUNNY_API_KEY: "",
		});

		const res = await POST(
			makeReq({ lessonId: LESSON_ID, courseId: COURSE_ID }),
		);

		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.code).toBe("internal_error");
		expect(body.message).toContain("Bunny");
	});

	it("returns 500 when upstream call fails", async () => {
		getLessonVideoAsset.mockResolvedValue({
			assetId: "asset-1",
			bunnyId: "bunny-1",
			storage: "bunny_stream",
		});
		fetchMock.mockResolvedValue({
			ok: false,
			status: 500,
			text: async () => "broken",
		});

		const res = await POST(
			makeReq({ lessonId: LESSON_ID, courseId: COURSE_ID }),
		);

		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.code).toBe("internal_error");
		expect(setAssetEncoding).not.toHaveBeenCalled();
	});

	it("rejects non-uuid lessonId with 400", async () => {
		const res = await POST(
			makeReq({ lessonId: "bogus", courseId: COURSE_ID }),
		);

		expect(res.status).toBe(400);
	});
});
