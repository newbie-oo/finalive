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
	bulkRejectSlips,
	REJECT_REASONS,
} = vi.hoisted(() => ({
	requireSessionThrow: vi.fn(),
	requireRoleThrow: vi.fn(),
	bulkRejectSlips: vi.fn(),
	REJECT_REASONS: ["amount_mismatch", "image_unreadable", "other"] as const,
}));
vi.mock("@/server/auth-session", () => ({
	requireSessionThrow,
	requireRoleThrow,
}));
vi.mock("@/server/actions/admin-slip", () => ({
	bulkRejectSlips,
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

const UUID_A = "11111111-1111-1111-1111-111111111111";

function makeReq(body: unknown): NextRequest {
	return new NextRequest(
		"http://localhost:3000/api/admin/slips/bulk-reject",
		{
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body),
		},
	);
}

describe("POST /api/admin/slips/bulk-reject", () => {
	beforeEach(() => {
		_resetRateLimitForTests();
		vi.clearAllMocks();
		requireRoleThrow.mockResolvedValue({ sessionId: "s1", user: ADMIN });
	});

	it("forwards slipIds, reason, note to bulkRejectSlips", async () => {
		bulkRejectSlips.mockResolvedValue({
			succeeded: 1,
			failed: 0,
			errors: [],
		});

		const res = await POST(
			makeReq({
				slipIds: [UUID_A],
				reason: "amount_mismatch",
				note: "doesn't match invoice",
			}),
		);

		expect(res.status).toBe(200);
		expect(bulkRejectSlips).toHaveBeenCalledWith(
			[UUID_A],
			"amount_mismatch",
			"doesn't match invoice",
		);
	});

	it("forwards undefined note when omitted", async () => {
		bulkRejectSlips.mockResolvedValue({
			succeeded: 1,
			failed: 0,
			errors: [],
		});

		await POST(
			makeReq({ slipIds: [UUID_A], reason: "image_unreadable" }),
		);

		expect(bulkRejectSlips).toHaveBeenCalledWith(
			[UUID_A],
			"image_unreadable",
			undefined,
		);
	});

	it("rejects unknown reason with 400", async () => {
		const res = await POST(
			makeReq({ slipIds: [UUID_A], reason: "totally_made_up" }),
		);

		expect(res.status).toBe(400);
		expect(bulkRejectSlips).not.toHaveBeenCalled();
	});

	it("rejects note longer than 500 chars with 400", async () => {
		const res = await POST(
			makeReq({
				slipIds: [UUID_A],
				reason: "other",
				note: "x".repeat(501),
			}),
		);

		expect(res.status).toBe(400);
		expect(bulkRejectSlips).not.toHaveBeenCalled();
	});
});
