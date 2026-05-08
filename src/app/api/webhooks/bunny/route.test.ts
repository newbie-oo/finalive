import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";
import { signHmacSha256 } from "@/lib/webhook-signature";

beforeAll(() => {
	process.env.BETTER_AUTH_SECRET ??= "test-secret-min-16-chars-long-xx";
	process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
	process.env.DATABASE_URL ??= "postgres://x:x@localhost:5432/x";
});

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({
	db: {},
	schema: {},
}));
vi.mock("@/server/auth", () => ({
	auth: { api: { getSession: vi.fn() } },
}));

const { getEnv, syncBunnyStatus } = vi.hoisted(() => ({
	getEnv: vi.fn(),
	syncBunnyStatus: vi.fn(),
}));
vi.mock("@/lib/env", () => ({ getEnv }));
vi.mock("@/server/services/bunny-status-service-factory", () => ({
	makeBunnyStatusService: () => ({ sync: syncBunnyStatus }),
}));

import { POST } from "./route";

const SECRET = "shared-webhook-secret";
const LIBRARY_ID = "12345";

function makeReq(
	body: object,
	{
		signature,
		algorithm = "hmac-sha256",
		version = "v1",
	}: {
		signature?: string;
		algorithm?: string;
		version?: string;
	} = {},
): NextRequest {
	const raw = JSON.stringify(body);
	const sig = signature ?? signHmacSha256(raw, SECRET);
	return new NextRequest("http://localhost:3000/api/webhooks/bunny", {
		method: "POST",
		headers: {
			"content-type": "application/json",
			"x-bunnystream-signature-version": version,
			"x-bunnystream-signature-algorithm": algorithm,
			"x-bunnystream-signature": sig,
		},
		body: raw,
	});
}

describe("POST /api/webhooks/bunny", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getEnv.mockReturnValue({
			BUNNY_LIBRARY_ID: LIBRARY_ID,
			BUNNY_WEBHOOK_SECRET: SECRET,
		});
	});

	it("syncs bunny status on a valid 'finished' (status=4) callback", async () => {
		syncBunnyStatus.mockResolvedValue({ changed: true, newStatus: "ready" });

		const res = await POST(
			makeReq({
				VideoLibraryId: Number(LIBRARY_ID),
				VideoGuid: "video-1",
				Status: 4,
				Length: 123.7,
			}),
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual({ ok: true });
		expect(syncBunnyStatus).toHaveBeenCalledWith("video-1", 4, 124);
	});

	it("returns ignored_status for status not in [1,4,5,6]", async () => {
		const res = await POST(
			makeReq({
				VideoLibraryId: Number(LIBRARY_ID),
				VideoGuid: "video-1",
				Status: 2,
			}),
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.note).toBe("ignored_status");
		expect(syncBunnyStatus).not.toHaveBeenCalled();
	});

	it("returns already_applied when service reports no change", async () => {
		syncBunnyStatus.mockResolvedValue({ changed: false });

		const res = await POST(
			makeReq({
				VideoLibraryId: Number(LIBRARY_ID),
				VideoGuid: "video-1",
				Status: 4,
				Length: 60,
			}),
		);

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body.note).toBe("already_applied");
	});

	it("rejects missing webhook secret with 422 (fail-closed)", async () => {
		getEnv.mockReturnValue({
			BUNNY_LIBRARY_ID: LIBRARY_ID,
			BUNNY_WEBHOOK_SECRET: undefined,
		});

		const res = await POST(
			makeReq({
				VideoLibraryId: Number(LIBRARY_ID),
				VideoGuid: "video-1",
				Status: 4,
			}),
		);

		expect(res.status).toBe(422);
		const body = await res.json();
		expect(body.code).toBe("invalid_state");
		expect(syncBunnyStatus).not.toHaveBeenCalled();
	});

	it("rejects unsupported signature scheme with 401", async () => {
		const res = await POST(
			makeReq(
				{
					VideoLibraryId: Number(LIBRARY_ID),
					VideoGuid: "video-1",
					Status: 4,
				},
				{ algorithm: "md5" },
			),
		);

		expect(res.status).toBe(401);
		const body = await res.json();
		expect(body.code).toBe("unauthorized");
	});

	it("rejects bad signature with 401", async () => {
		const res = await POST(
			makeReq(
				{
					VideoLibraryId: Number(LIBRARY_ID),
					VideoGuid: "video-1",
					Status: 4,
				},
				{ signature: "deadbeef" },
			),
		);

		expect(res.status).toBe(401);
		expect(syncBunnyStatus).not.toHaveBeenCalled();
	});

	it("rejects mismatched library id with 403", async () => {
		const res = await POST(
			makeReq({
				VideoLibraryId: 99999,
				VideoGuid: "video-1",
				Status: 4,
			}),
		);

		expect(res.status).toBe(403);
		const body = await res.json();
		expect(body.code).toBe("forbidden");
		expect(syncBunnyStatus).not.toHaveBeenCalled();
	});

	it("rejects missing VideoGuid with 400", async () => {
		const res = await POST(
			makeReq({
				VideoLibraryId: Number(LIBRARY_ID),
				Status: 4,
			}),
		);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.code).toBe("validation_failed");
	});

	it("rejects malformed JSON body with 400", async () => {
		const raw = "{not-json";
		const sig = signHmacSha256(raw, SECRET);
		const req = new NextRequest("http://localhost:3000/api/webhooks/bunny", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				"x-bunnystream-signature-version": "v1",
				"x-bunnystream-signature-algorithm": "hmac-sha256",
				"x-bunnystream-signature": sig,
			},
			body: raw,
		});

		const res = await POST(req);

		expect(res.status).toBe(400);
		const body = await res.json();
		expect(body.code).toBe("validation_failed");
	});
});
