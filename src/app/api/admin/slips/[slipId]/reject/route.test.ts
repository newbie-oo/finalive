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
	rejectSlip,
	REJECT_REASONS,
} = vi.hoisted(() => ({
	requireSessionThrow: vi.fn(),
	requireRoleThrow: vi.fn(),
	rejectSlip: vi.fn(),
	REJECT_REASONS: ["amount_mismatch", "image_unreadable", "other"] as const,
}));
vi.mock("@/server/auth-session", () => ({
	requireSessionThrow,
	requireRoleThrow,
}));
vi.mock("@/server/actions/admin-slip", () => ({
	rejectSlip,
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

function makeReq(slipId: string, body: unknown): NextRequest {
	return new NextRequest(
		`http://localhost:3000/api/admin/slips/${slipId}/reject`,
		{
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body),
		},
	);
}

describe("POST /api/admin/slips/[slipId]/reject", () => {
	beforeEach(() => {
		_resetRateLimitForTests();
		vi.clearAllMocks();
		requireRoleThrow.mockResolvedValue({ sessionId: "s1", user: ADMIN });
	});

	it("extracts slipId from URL and forwards reason+note", async () => {
		rejectSlip.mockResolvedValue({
			slipId: SLIP_ID,
			status: "rejected",
		});

		const res = await POST(
			makeReq(SLIP_ID, {
				reason: "amount_mismatch",
				note: "wrong amount",
			}),
		);

		expect(res.status).toBe(200);
		expect(rejectSlip).toHaveBeenCalledWith({
			slipId: SLIP_ID,
			reason: "amount_mismatch",
			note: "wrong amount",
		});
	});

	it("rejects unknown reason with 400", async () => {
		const res = await POST(
			makeReq(SLIP_ID, { reason: "made_up_reason" }),
		);

		expect(res.status).toBe(400);
		expect(rejectSlip).not.toHaveBeenCalled();
	});

	it("rejects missing reason with 400", async () => {
		const res = await POST(makeReq(SLIP_ID, {}));

		expect(res.status).toBe(400);
		expect(rejectSlip).not.toHaveBeenCalled();
	});
});
