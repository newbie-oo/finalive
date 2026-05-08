import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest, NextResponse } from "next/server";

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

import { POST } from "./route";

const USER = {
	id: "u1",
	email: "u1@x.com",
	name: "U1",
	role: "user",
	emailVerified: true,
};

function makeReq(): NextRequest {
	return new NextRequest("http://localhost:3000/api/upload/lesson-image", {
		method: "POST",
		body: new FormData(),
	});
}

describe("POST /api/upload/lesson-image", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		requireSessionThrow.mockResolvedValue({ sessionId: "s1", user: USER });
	});

	it("delegates to runImageUpload and forwards user", async () => {
		runImageUpload.mockResolvedValue(
			NextResponse.json({ mediaAssetId: "m1", url: "https://x" }),
		);

		const res = await POST(makeReq());

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.mediaAssetId).toBe("m1");
		expect(runImageUpload).toHaveBeenCalledWith(
			expect.any(Object),
			expect.objectContaining({ id: "u1" }),
			expect.objectContaining({ logPrefix: "Lesson image" }),
		);
	});

	it("returns 401 without session", async () => {
		const { ApiError } = await import("@/lib/api-error");
		requireSessionThrow.mockRejectedValueOnce(
			new ApiError("unauthorized", "login required"),
		);

		const res = await POST(makeReq());

		expect(res.status).toBe(401);
		expect(runImageUpload).not.toHaveBeenCalled();
	});

	it("propagates ApiError from runImageUpload to response envelope", async () => {
		const { ApiError } = await import("@/lib/api-error");
		runImageUpload.mockRejectedValueOnce(
			new ApiError("validation_failed", "invalid file"),
		);

		const res = await POST(makeReq());

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.code).toBe("validation_failed");
	});
});
