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
	acceptSlip,
	REJECT_REASONS,
} = vi.hoisted(() => ({
	requireSessionThrow: vi.fn(),
	requireRoleThrow: vi.fn(),
	acceptSlip: vi.fn(),
	REJECT_REASONS: ["amount_mismatch", "image_unreadable", "other"] as const,
}));
vi.mock("@/server/auth-session", () => ({
	requireSessionThrow,
	requireRoleThrow,
}));
vi.mock("@/server/actions/admin-slip", () => ({
	acceptSlip,
	REJECT_REASONS,
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

const SLIP_ID = "11111111-1111-1111-1111-111111111111";

function makeReq(slipId: string): NextRequest {
	return new NextRequest(
		`http://localhost:3000/api/admin/slips/${slipId}/accept`,
		{ method: "POST" },
	);
}

describe("POST /api/admin/slips/[slipId]/accept", () => {
	beforeEach(() => {
		_resetRateLimitForTests();
		vi.clearAllMocks();
		requireRoleThrow.mockResolvedValue({ sessionId: "s1", user: ADMIN });
	});

	it("extracts slipId from URL and forwards to acceptSlip", async () => {
		acceptSlip.mockResolvedValue({ slipId: SLIP_ID, status: "accepted" });

		const res = await POST(makeReq(SLIP_ID));

		expect(res.status).toBe(200);
		expect(acceptSlip).toHaveBeenCalledWith(SLIP_ID);
	});

	it("propagates ApiError from action with mapped status", async () => {
		const { ApiError } = await import("@/lib/api-error");
		acceptSlip.mockRejectedValue(
			new ApiError("slip_already_reviewed", "already accepted"),
		);

		const res = await POST(makeReq(SLIP_ID));

		expect(res.status).toBe(409);
		const body = await res.json();
		expect(body.code).toBe("slip_already_reviewed");
	});

	it("rejects non-admin with 403", async () => {
		const { ApiError } = await import("@/lib/api-error");
		requireRoleThrow.mockRejectedValueOnce(
			new ApiError("forbidden", "admin only"),
		);

		const res = await POST(makeReq(SLIP_ID));

		expect(res.status).toBe(403);
		expect(acceptSlip).not.toHaveBeenCalled();
	});
});
