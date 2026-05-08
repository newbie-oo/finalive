import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";

beforeAll(() => {
	process.env.BETTER_AUTH_SECRET ??= "test-secret-min-16-chars-long-xx";
	process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
	process.env.DATABASE_URL ??= "postgres://x:x@localhost:5432/x";
});

vi.mock("server-only", () => ({}));

const { requireSessionThrow, requireRoleThrow, uploadSlip } = vi.hoisted(
	() => ({
		requireSessionThrow: vi.fn(),
		requireRoleThrow: vi.fn(),
		uploadSlip: vi.fn(),
	}),
);
vi.mock("@/server/auth-session", () => ({
	requireSessionThrow,
	requireRoleThrow,
}));
vi.mock("@/server/actions/slip", () => ({ uploadSlip }));

import { POST } from "./route";
import { _resetRateLimitForTests } from "@/lib/rate-limit";

const USER = {
	id: "u1",
	email: "u1@example.com",
	name: "U1",
	role: "user",
	emailVerified: true,
};

function makeReq(form: FormData): NextRequest {
	return new NextRequest("http://localhost:3000/api/slip/upload", {
		method: "POST",
		body: form,
	});
}

describe("POST /api/slip/upload", () => {
	beforeEach(() => {
		_resetRateLimitForTests();
		vi.clearAllMocks();
		requireSessionThrow.mockResolvedValue({ sessionId: "s1", user: USER });
	});

	it("returns 400 when pendingId is missing", async () => {
		const form = new FormData();
		form.append("slip", new File(["x"], "slip.png", { type: "image/png" }));

		const res = await POST(makeReq(form));

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.code).toBe("validation_failed");
		expect(uploadSlip).not.toHaveBeenCalled();
	});

	it("returns 400 when slip file is missing", async () => {
		const form = new FormData();
		form.append("pendingId", "pending-123");

		const res = await POST(makeReq(form));

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.code).toBe("validation_failed");
		expect(uploadSlip).not.toHaveBeenCalled();
	});

	it("redirects to checkout page on successful upload", async () => {
		uploadSlip.mockResolvedValue({
			slipId: "slip-1",
			pendingId: "pending-123",
			status: "submitted",
		});

		const form = new FormData();
		form.append("pendingId", "pending-123");
		form.append(
			"slip",
			new File(["abc"], "slip.png", { type: "image/png" }),
		);
		form.append("reportedAmount", "1990.00");

		const res = await POST(makeReq(form));

		expect(res.status).toBe(303);
		expect(res.headers.get("location")).toBe(
			"http://localhost:3000/checkout/pending-123",
		);
		expect(uploadSlip).toHaveBeenCalledWith({
			pendingId: "pending-123",
			bytes: expect.any(Buffer),
			reportedAmount: "1990.00",
		});
	});

	it("omits reportedAmount when empty", async () => {
		uploadSlip.mockResolvedValue({
			slipId: "slip-1",
			pendingId: "pending-123",
			status: "submitted",
		});

		const form = new FormData();
		form.append("pendingId", "pending-123");
		form.append(
			"slip",
			new File(["abc"], "slip.png", { type: "image/png" }),
		);

		await POST(makeReq(form));

		expect(uploadSlip).toHaveBeenCalledWith(
			expect.objectContaining({ reportedAmount: undefined }),
		);
	});

	it("returns 401-shaped error when session missing", async () => {
		const { ApiError } = await import("@/lib/api-error");
		requireSessionThrow.mockRejectedValueOnce(
			new ApiError("unauthorized", "login required"),
		);

		const form = new FormData();
		form.append("pendingId", "pending-123");
		form.append(
			"slip",
			new File(["abc"], "slip.png", { type: "image/png" }),
		);

		const res = await POST(makeReq(form));

		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.code).toBe("unauthorized");
		expect(uploadSlip).not.toHaveBeenCalled();
	});
});
