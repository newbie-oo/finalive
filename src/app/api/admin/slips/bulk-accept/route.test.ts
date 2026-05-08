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
	bulkAcceptSlips,
	REJECT_REASONS,
} = vi.hoisted(() => ({
	requireSessionThrow: vi.fn(),
	requireRoleThrow: vi.fn(),
	bulkAcceptSlips: vi.fn(),
	REJECT_REASONS: ["amount_mismatch", "image_unreadable", "other"] as const,
}));
vi.mock("@/server/auth-session", () => ({
	requireSessionThrow,
	requireRoleThrow,
}));
vi.mock("@/server/actions/admin-slip", () => ({
	bulkAcceptSlips,
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
const UUID_B = "22222222-2222-2222-2222-222222222222";

function makeReq(body: unknown): NextRequest {
	return new NextRequest(
		"http://localhost:3000/api/admin/slips/bulk-accept",
		{
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body),
		},
	);
}

describe("POST /api/admin/slips/bulk-accept", () => {
	beforeEach(() => {
		_resetRateLimitForTests();
		vi.clearAllMocks();
		requireRoleThrow.mockResolvedValue({ sessionId: "s1", user: ADMIN });
	});

	it("forwards slipIds to bulkAcceptSlips", async () => {
		bulkAcceptSlips.mockResolvedValue({
			succeeded: 2,
			failed: 0,
			errors: [],
		});

		const res = await POST(makeReq({ slipIds: [UUID_A, UUID_B] }));

		expect(res.status).toBe(200);
		expect(bulkAcceptSlips).toHaveBeenCalledWith([UUID_A, UUID_B]);
	});

	it("rejects empty slipIds array with 400", async () => {
		const res = await POST(makeReq({ slipIds: [] }));

		expect(res.status).toBe(400);
		expect(bulkAcceptSlips).not.toHaveBeenCalled();
	});

	it("rejects non-uuid slipIds with 400", async () => {
		const res = await POST(makeReq({ slipIds: ["not-a-uuid"] }));

		expect(res.status).toBe(400);
		expect(bulkAcceptSlips).not.toHaveBeenCalled();
	});

	it("rejects more than 50 slipIds with 400", async () => {
		const ids = Array.from(
			{ length: 51 },
			(_, i) =>
				`33333333-3333-3333-3333-${i.toString().padStart(12, "0")}`,
		);

		const res = await POST(makeReq({ slipIds: ids }));

		expect(res.status).toBe(400);
		expect(bulkAcceptSlips).not.toHaveBeenCalled();
	});

	it("rejects invalid JSON with 400", async () => {
		const req = new NextRequest(
			"http://localhost:3000/api/admin/slips/bulk-accept",
			{
				method: "POST",
				headers: { "content-type": "application/json" },
				body: "{not-json",
			},
		);

		const res = await POST(req);

		expect(res.status).toBe(400);
		expect(bulkAcceptSlips).not.toHaveBeenCalled();
	});

	it("rejects non-admin with 403", async () => {
		const { ApiError } = await import("@/lib/api-error");
		requireRoleThrow.mockRejectedValueOnce(
			new ApiError("forbidden", "admin only"),
		);

		const res = await POST(makeReq({ slipIds: [UUID_A] }));

		expect(res.status).toBe(403);
		expect(bulkAcceptSlips).not.toHaveBeenCalled();
	});
});
