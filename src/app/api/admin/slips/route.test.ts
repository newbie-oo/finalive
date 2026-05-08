import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";

beforeAll(() => {
	process.env.BETTER_AUTH_SECRET ??= "test-secret-min-16-chars-long-xx";
	process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
	process.env.DATABASE_URL ??= "postgres://x:x@localhost:5432/x";
});

vi.mock("server-only", () => ({}));

const { requireSessionThrow, requireRoleThrow, listPendingSlips } = vi.hoisted(
	() => ({
		requireSessionThrow: vi.fn(),
		requireRoleThrow: vi.fn(),
		listPendingSlips: vi.fn(),
	}),
);
vi.mock("@/server/auth-session", () => ({
	requireSessionThrow,
	requireRoleThrow,
}));
vi.mock("@/server/repos/slip", () => ({ listPendingSlips }));

import { GET } from "./route";
import { _resetRateLimitForTests } from "@/lib/rate-limit";

const ADMIN = {
	id: "admin1",
	email: "admin@x.com",
	name: "Admin",
	role: "admin",
	emailVerified: true,
};

function makeReq(qs = ""): NextRequest {
	return new NextRequest(
		`http://localhost:3000/api/admin/slips${qs ? `?${qs}` : ""}`,
	);
}

describe("GET /api/admin/slips", () => {
	beforeEach(() => {
		_resetRateLimitForTests();
		vi.clearAllMocks();
		requireRoleThrow.mockResolvedValue({ sessionId: "s1", user: ADMIN });
	});

	it("uses default status='submitted' when query missing", async () => {
		listPendingSlips.mockResolvedValue({ data: [], next_cursor: null });

		const res = await GET(makeReq());

		expect(res.status).toBe(200);
		expect(listPendingSlips).toHaveBeenCalledWith({
			status: "submitted",
			per_page: 50,
		});
	});

	it("forwards parsed status, cursor, per_page", async () => {
		listPendingSlips.mockResolvedValue({ data: [], next_cursor: null });

		await GET(makeReq("status=accepted&cursor=abc&per_page=10"));

		expect(listPendingSlips).toHaveBeenCalledWith({
			status: "accepted",
			cursor: "abc",
			per_page: 10,
		});
	});

	it("rejects invalid status with 400", async () => {
		const res = await GET(makeReq("status=bogus"));

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.code).toBe("validation_failed");
		expect(listPendingSlips).not.toHaveBeenCalled();
	});

	it("rejects per_page out of range with 400", async () => {
		const res = await GET(makeReq("per_page=999"));

		expect(res.status).toBe(400);
		expect(listPendingSlips).not.toHaveBeenCalled();
	});

	it("rejects non-admin with 403", async () => {
		const { ApiError } = await import("@/lib/api-error");
		requireRoleThrow.mockRejectedValueOnce(
			new ApiError("forbidden", "admin only"),
		);

		const res = await GET(makeReq());

		expect(res.status).toBe(403);
		expect(listPendingSlips).not.toHaveBeenCalled();
	});
});
