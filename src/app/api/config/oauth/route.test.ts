import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";
import { NextRequest } from "next/server";

beforeAll(() => {
	process.env.BETTER_AUTH_SECRET ??= "test-secret-min-16-chars-long-xx";
	process.env.BETTER_AUTH_URL ??= "http://localhost:3000";
	process.env.DATABASE_URL ??= "postgres://x:x@localhost:5432/x";
});

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({ db: {}, schema: {} }));
vi.mock("@/server/auth", () => ({ auth: { api: { getSession: vi.fn() } } }));

const { getEnv } = vi.hoisted(() => ({ getEnv: vi.fn() }));
vi.mock("@/lib/env", () => ({ getEnv }));
vi.mock("@/server/auth-session", () => ({
	requireSessionThrow: vi.fn(),
	requireRoleThrow: vi.fn(),
}));

import { GET } from "./route";

function makeReq(): NextRequest {
	return new NextRequest("http://localhost:3000/api/config/oauth");
}

describe("GET /api/config/oauth", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("reports google=true when both client id and secret present", async () => {
		getEnv.mockReturnValue({
			GOOGLE_CLIENT_ID: "id",
			GOOGLE_CLIENT_SECRET: "secret",
		});

		const res = await GET(makeReq());

		expect(res.status).toBe(200);
		const body = await res.json();
		expect(body).toEqual({ google: true });
	});

	it("reports google=false when client id missing", async () => {
		getEnv.mockReturnValue({
			GOOGLE_CLIENT_ID: "",
			GOOGLE_CLIENT_SECRET: "secret",
		});

		const res = await GET(makeReq());

		const body = await res.json();
		expect(body).toEqual({ google: false });
	});

	it("reports google=false when secret missing", async () => {
		getEnv.mockReturnValue({
			GOOGLE_CLIENT_ID: "id",
			GOOGLE_CLIENT_SECRET: "",
		});

		const res = await GET(makeReq());

		const body = await res.json();
		expect(body).toEqual({ google: false });
	});
});
