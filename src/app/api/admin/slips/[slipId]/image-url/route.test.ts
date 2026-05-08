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
	presignReadUrl,
	getSlipImageMedia,
} = vi.hoisted(() => ({
	requireSessionThrow: vi.fn(),
	requireRoleThrow: vi.fn(),
	presignReadUrl: vi.fn(),
	getSlipImageMedia: vi.fn(),
}));
vi.mock("@/server/auth-session", () => ({
	requireSessionThrow,
	requireRoleThrow,
}));
vi.mock("@/server/services/r2", () => ({ presignReadUrl }));
vi.mock("@/server/payments/slip-repo", () => ({
	SlipRepo: { getSlipImageMedia },
}));

import { GET } from "./route";
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
		`http://localhost:3000/api/admin/slips/${slipId}/image-url`,
	);
}

describe("GET /api/admin/slips/[slipId]/image-url", () => {
	beforeEach(() => {
		_resetRateLimitForTests();
		vi.clearAllMocks();
		requireRoleThrow.mockResolvedValue({ sessionId: "s1", user: ADMIN });
	});

	it("returns presigned URL for r2_private storage", async () => {
		getSlipImageMedia.mockResolvedValue({
			storage: "r2_private",
			storageKey: "slips/abc.jpg",
			mimeType: "image/jpeg",
		});
		presignReadUrl.mockResolvedValue("https://signed.example/url");

		const res = await GET(makeReq(SLIP_ID));

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.url).toBe("https://signed.example/url");
		expect(body.mimeType).toBe("image/jpeg");
		expect(body.expiresInSeconds).toBe(600);
		expect(presignReadUrl).toHaveBeenCalledWith({
			bucket: "private",
			key: "slips/abc.jpg",
			expiresInSeconds: 600,
		});
	});

	it("returns 404 when slip media not found", async () => {
		getSlipImageMedia.mockResolvedValue(null);

		const res = await GET(makeReq(SLIP_ID));

		expect(res.status).toBe(404);
		const body = await res.json();
		expect(body.code).toBe("not_found");
		expect(presignReadUrl).not.toHaveBeenCalled();
	});

	it("returns 422 when storage is not r2_private", async () => {
		getSlipImageMedia.mockResolvedValue({
			storage: "r2_public",
			storageKey: "slips/abc.jpg",
			mimeType: "image/jpeg",
		});

		const res = await GET(makeReq(SLIP_ID));

		expect(res.status).toBe(422);
		const body = await res.json();
		expect(body.code).toBe("invalid_state");
		expect(presignReadUrl).not.toHaveBeenCalled();
	});

	it("rejects non-admin with 403", async () => {
		const { ApiError } = await import("@/lib/api-error");
		requireRoleThrow.mockRejectedValueOnce(
			new ApiError("forbidden", "admin only"),
		);

		const res = await GET(makeReq(SLIP_ID));

		expect(res.status).toBe(403);
		expect(getSlipImageMedia).not.toHaveBeenCalled();
	});
});
