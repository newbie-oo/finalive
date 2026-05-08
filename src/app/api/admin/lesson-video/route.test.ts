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
	createVideo,
	cancelVideo,
} = vi.hoisted(() => ({
	requireSessionThrow: vi.fn(),
	requireRoleThrow: vi.fn(),
	getEnv: vi.fn(),
	getCourseOwnerId: vi.fn(),
	getCollaboratorRole: vi.fn(),
	createVideo: vi.fn(),
	cancelVideo: vi.fn(),
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
vi.mock("@/server/services/bunny-stream", () => ({
	HttpBunnyStreamClient: class {},
}));
vi.mock("@/server/repos/lesson-video", () => ({
	LessonVideoRepo: {
		getLessonVideoMediaId: vi.fn(),
		createVideoAsset: vi.fn(),
		updateLessonVideo: vi.fn(),
		findAssetByBunnyId: vi.fn(),
		findPreviousVideoMediaId: vi.fn(),
		deleteMediaAsset: vi.fn(),
	},
}));
vi.mock("@/server/services/lesson-video", () => ({
	LessonVideoService: class {
		createVideo = createVideo;
		cancelVideo = cancelVideo;
	},
}));

import { POST } from "./route";
import { _resetRateLimitForTests } from "@/lib/rate-limit";

const OWNER = {
	id: "owner1",
	email: "owner@x.com",
	name: "Owner",
	role: "user",
	emailVerified: true,
};

const NON_OWNER = { ...OWNER, id: "stranger" };

const COURSE_ID = "11111111-1111-1111-1111-111111111111";
const LESSON_ID = "22222222-2222-2222-2222-222222222222";

function makeReq(body: unknown): NextRequest {
	return new NextRequest("http://localhost:3000/api/admin/lesson-video", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("POST /api/admin/lesson-video", () => {
	beforeEach(() => {
		_resetRateLimitForTests();
		vi.clearAllMocks();
		requireSessionThrow.mockResolvedValue({ sessionId: "s1", user: OWNER });
		getCourseOwnerId.mockResolvedValue("owner1");
		getCollaboratorRole.mockResolvedValue(null);
		getEnv.mockReturnValue({ BUNNY_API_KEY: "key-1" });
	});

	it("creates a video for course owner", async () => {
		createVideo.mockResolvedValue({
			bunnyVideoId: "bunny-1",
			uploadUrl: "https://upload.example/1",
			assetId: "asset-1",
			oldMediaId: null,
		});

		const res = await POST(
			makeReq({
				action: "create",
				courseId: COURSE_ID,
				lessonId: LESSON_ID,
				fileName: "v.mp4",
			}),
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.ok).toBe(true);
		expect(body.bunnyVideoId).toBe("bunny-1");
		expect(body.uploadUrl).toBe("https://upload.example/1");
		expect(body.apiKey).toBe("key-1");
		expect(createVideo).toHaveBeenCalledWith({
			lessonId: LESSON_ID,
			fileName: "v.mp4",
			userId: "owner1",
		});
	});

	it("cancels a video for course owner", async () => {
		cancelVideo.mockResolvedValue({ restoredMediaId: "media-prev" });

		const res = await POST(
			makeReq({
				action: "cancel",
				courseId: COURSE_ID,
				lessonId: LESSON_ID,
				bunnyVideoId: "bunny-1",
			}),
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.ok).toBe(true);
		expect(body.restoredMediaId).toBe("media-prev");
		expect(cancelVideo).toHaveBeenCalledWith({
			lessonId: LESSON_ID,
			bunnyVideoId: "bunny-1",
		});
	});

	it("returns 403 when user cannot edit course", async () => {
		requireSessionThrow.mockResolvedValue({
			sessionId: "s1",
			user: NON_OWNER,
		});
		getCourseOwnerId.mockResolvedValue("someone-else");
		getCollaboratorRole.mockResolvedValue(null);

		const res = await POST(
			makeReq({
				action: "create",
				courseId: COURSE_ID,
				lessonId: LESSON_ID,
			}),
		);

		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.code).toBe("forbidden");
		expect(createVideo).not.toHaveBeenCalled();
	});

	it("returns 422 when bunny API key not configured", async () => {
		getEnv.mockReturnValue({ BUNNY_API_KEY: undefined });

		const res = await POST(
			makeReq({
				action: "create",
				courseId: COURSE_ID,
				lessonId: LESSON_ID,
			}),
		);

		expect(res.status).toBe(422);
		const body = await res.json();
		expect(body.code).toBe("invalid_state");
	});

	it("rejects cancel without bunnyVideoId with 400", async () => {
		const res = await POST(
			makeReq({
				action: "cancel",
				courseId: COURSE_ID,
				lessonId: LESSON_ID,
			}),
		);

		expect(res.status).toBe(400);
		expect(cancelVideo).not.toHaveBeenCalled();
	});

	it("maps unexpected create errors to 500 internal_error", async () => {
		createVideo.mockRejectedValue(new Error("upstream broken"));

		const res = await POST(
			makeReq({
				action: "create",
				courseId: COURSE_ID,
				lessonId: LESSON_ID,
			}),
		);

		expect(res.status).toBe(500);
		const body = await res.json();
		expect(body.code).toBe("internal_error");
	});

	it("rejects unknown action with 400", async () => {
		const res = await POST(
			makeReq({
				action: "delete",
				courseId: COURSE_ID,
				lessonId: LESSON_ID,
			}),
		);

		expect(res.status).toBe(400);
	});
});
