import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";

beforeAll(() => {
	process.env.BETTER_AUTH_SECRET ??= "test-secret-min-16-chars-long-xx";
	process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
	process.env.DATABASE_URL ??= "postgres://x:x@localhost:5432/x";
});

vi.mock("server-only", () => ({}));

const {
	requireSessionThrow,
	requireRoleThrow,
	updateWatchedSeconds,
	handleLessonComplete,
	assertCanWriteLessonProgress,
} = vi.hoisted(() => ({
	requireSessionThrow: vi.fn(),
	requireRoleThrow: vi.fn(),
	updateWatchedSeconds: vi.fn(),
	handleLessonComplete: vi.fn(),
	assertCanWriteLessonProgress: vi.fn(),
}));
vi.mock("@/server/auth-session", () => ({
	requireSessionThrow,
	requireRoleThrow,
}));
vi.mock("@/server/repos/progress", () => ({ updateWatchedSeconds }));
vi.mock("@/server/container", () => ({
	container: {
		courseCompletion: () => ({ handleLessonComplete }),
	},
}));
vi.mock("@/server/services/lesson-progress-authz", () => ({
	assertCanWriteLessonProgress,
}));

import { POST } from "./route";
import { _resetRateLimitForTests } from "@/lib/rate-limit";

const USER = {
	id: "u1",
	email: "u1@x.com",
	name: "U1",
	role: "user",
	emailVerified: true,
};

const ADMIN = { ...USER, id: "admin1", role: "admin" };
const LESSON_ID = "11111111-1111-1111-1111-111111111111";

function makeReq(body: unknown): NextRequest {
	return new NextRequest("http://localhost:3000/api/learn/progress", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("POST /api/learn/progress", () => {
	beforeEach(() => {
		_resetRateLimitForTests();
		vi.clearAllMocks();
		requireSessionThrow.mockResolvedValue({ sessionId: "s1", user: USER });
		assertCanWriteLessonProgress.mockResolvedValue(undefined);
	});

	it("updates watched seconds when markComplete is false/absent", async () => {
		updateWatchedSeconds.mockResolvedValue(undefined);

		const res = await POST(
			makeReq({ lessonId: LESSON_ID, watchedSeconds: 42 }),
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual({ ok: true, completed: false });
		expect(updateWatchedSeconds).toHaveBeenCalledWith("u1", LESSON_ID, 42);
		expect(handleLessonComplete).not.toHaveBeenCalled();
	});

	it("calls course-completion handler when markComplete is true", async () => {
		handleLessonComplete.mockResolvedValue({
			lessonCompleted: true,
			courseCompleted: false,
		});

		const res = await POST(
			makeReq({
				lessonId: LESSON_ID,
				watchedSeconds: 600,
				markComplete: true,
				durationSeconds: 600,
			}),
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.ok).toBe(true);
		expect(body.lessonCompleted).toBe(true);
		expect(handleLessonComplete).toHaveBeenCalledWith({
			userId: "u1",
			userEmail: "u1@x.com",
			userRole: "user",
			lessonId: LESSON_ID,
			durationSeconds: 600,
		});
		expect(updateWatchedSeconds).not.toHaveBeenCalled();
	});

	it("ignores admin previews regardless of markComplete", async () => {
		requireSessionThrow.mockResolvedValue({
			sessionId: "s1",
			user: ADMIN,
		});

		const res = await POST(
			makeReq({
				lessonId: LESSON_ID,
				watchedSeconds: 600,
				markComplete: true,
			}),
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual({ ok: true, ignored: "admin_preview" });
		expect(updateWatchedSeconds).not.toHaveBeenCalled();
		expect(handleLessonComplete).not.toHaveBeenCalled();
	});

	it("rejects negative watchedSeconds with 400", async () => {
		const res = await POST(
			makeReq({ lessonId: LESSON_ID, watchedSeconds: -1 }),
		);

		expect(res.status).toBe(400);
		expect(updateWatchedSeconds).not.toHaveBeenCalled();
	});

	it("returns 403 when user is not entitled to the lesson", async () => {
		const { ApiError } = await import("@/lib/api-error");
		assertCanWriteLessonProgress.mockRejectedValueOnce(
			new ApiError("forbidden", "lesson not accessible"),
		);

		const res = await POST(
			makeReq({ lessonId: LESSON_ID, watchedSeconds: 10 }),
		);

		expect(res.status).toBe(403);
		expect(updateWatchedSeconds).not.toHaveBeenCalled();
	});

	it("rejects non-uuid lessonId with 400", async () => {
		const res = await POST(
			makeReq({ lessonId: "bogus", watchedSeconds: 0 }),
		);

		expect(res.status).toBe(400);
		expect(updateWatchedSeconds).not.toHaveBeenCalled();
	});
});
