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
	upsertLessonProgress,
} = vi.hoisted(() => ({
	requireSessionThrow: vi.fn(),
	requireRoleThrow: vi.fn(),
	upsertLessonProgress: vi.fn(),
}));
vi.mock("@/server/auth-session", () => ({
	requireSessionThrow,
	requireRoleThrow,
}));
vi.mock("@/server/repos/progress", () => ({ upsertLessonProgress }));

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
	return new NextRequest("http://localhost:3000/api/learn/start", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify(body),
	});
}

describe("POST /api/learn/start", () => {
	beforeEach(() => {
		_resetRateLimitForTests();
		vi.clearAllMocks();
		requireSessionThrow.mockResolvedValue({ sessionId: "s1", user: USER });
	});

	it("upserts progress for normal user", async () => {
		upsertLessonProgress.mockResolvedValue(undefined);

		const res = await POST(makeReq({ lessonId: LESSON_ID }));

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual({ ok: true });
		expect(upsertLessonProgress).toHaveBeenCalledWith("u1", LESSON_ID);
	});

	it("ignores admin previews without writing progress", async () => {
		requireSessionThrow.mockResolvedValue({
			sessionId: "s1",
			user: ADMIN,
		});

		const res = await POST(makeReq({ lessonId: LESSON_ID }));

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual({ ok: true, ignored: "admin_preview" });
		expect(upsertLessonProgress).not.toHaveBeenCalled();
	});

	it("rejects non-uuid lessonId with 400", async () => {
		const res = await POST(makeReq({ lessonId: "not-a-uuid" }));

		expect(res.status).toBe(400);
		expect(upsertLessonProgress).not.toHaveBeenCalled();
	});

	it("rejects missing body with 400", async () => {
		const res = await POST(makeReq({}));

		expect(res.status).toBe(400);
		expect(upsertLessonProgress).not.toHaveBeenCalled();
	});

	it("returns 401 when session missing", async () => {
		const { ApiError } = await import("@/lib/api-error");
		requireSessionThrow.mockRejectedValueOnce(
			new ApiError("unauthorized", "login required"),
		);

		const res = await POST(makeReq({ lessonId: LESSON_ID }));

		expect(res.status).toBe(401);
		expect(upsertLessonProgress).not.toHaveBeenCalled();
	});
});
