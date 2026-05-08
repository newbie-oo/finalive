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
	getCheckoutPending,
} = vi.hoisted(() => ({
	requireSessionThrow: vi.fn(),
	requireRoleThrow: vi.fn(),
	getCheckoutPending: vi.fn(),
}));
vi.mock("@/server/auth-session", () => ({
	requireSessionThrow,
	requireRoleThrow,
}));
vi.mock("@/server/repos/checkout", () => ({ getCheckoutPending }));

import { GET } from "./route";
import { _resetRateLimitForTests } from "@/lib/rate-limit";

const USER = {
	id: "u1",
	email: "u1@x.com",
	name: "U1",
	role: "user",
	emailVerified: true,
};

const PENDING_ID = "11111111-1111-1111-1111-111111111111";

function makeReq(pendingId: string): NextRequest {
	return new NextRequest(
		`http://localhost:3000/api/checkout/${pendingId}/status`,
	);
}

describe("GET /api/checkout/[pendingId]/status", () => {
	beforeEach(() => {
		_resetRateLimitForTests();
		vi.clearAllMocks();
		requireSessionThrow.mockResolvedValue({ sessionId: "s1", user: USER });
	});

	it("returns checkout fields for owner", async () => {
		getCheckoutPending.mockResolvedValue({
			status: "awaiting_payment",
			courseSlug: "value-investing",
			refCode: "REF-123",
			amount: "1990.00",
		});

		const res = await GET(makeReq(PENDING_ID));

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual({
			status: "awaiting_payment",
			courseSlug: "value-investing",
			refCode: "REF-123",
			amount: "1990.00",
		});
		expect(getCheckoutPending).toHaveBeenCalledWith(PENDING_ID, "u1");
	});

	it("returns 404 when pending not found or not owned by user", async () => {
		getCheckoutPending.mockResolvedValue(null);

		const res = await GET(makeReq(PENDING_ID));

		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.code).toBe("not_found");
	});

	it("returns 401 when session missing", async () => {
		const { ApiError } = await import("@/lib/api-error");
		requireSessionThrow.mockRejectedValueOnce(
			new ApiError("unauthorized", "login required"),
		);

		const res = await GET(makeReq(PENDING_ID));

		expect(res.status).toBe(401);
		expect(getCheckoutPending).not.toHaveBeenCalled();
	});
});
