import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { ApiError } from "@/lib/api-error";
import { apiRoute } from "@/lib/api-route";

vi.mock("server-only", () => ({}));

// Minimal mock for auth-session — we test auth behaviour via the wrapper,
// not the session implementation itself.
const mockRequireSession = vi.fn();
const mockRequireRole = vi.fn();

vi.mock("@/server/auth-session", () => ({
	requireSessionThrow: (...args: unknown[]) => mockRequireSession(...args),
	requireRoleThrow: (...args: unknown[]) => mockRequireRole(...args),
}));

function makeReq(body?: unknown, query?: Record<string, string>): Request {
	const url = new URL("http://localhost/api/test");
	if (query) {
		for (const [k, v] of Object.entries(query)) {
			url.searchParams.set(k, v);
		}
	}
	return new Request(url, {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: body ? JSON.stringify(body) : undefined,
	});
}

beforeEach(() => {
	mockRequireSession.mockReset();
	mockRequireRole.mockReset();
});

describe("apiRoute", () => {
	it("returns handler result as JSON", async () => {
		const handler = apiRoute({
			handler: async () => ({ ok: true }),
		});
		const res = await handler(makeReq() as unknown as NextRequest);
		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true });
	});

	it("injects user when auth=required", async () => {
		mockRequireSession.mockResolvedValue({
			user: { id: "u1", email: "a@b.com", role: "student" },
		});
		const handler = apiRoute({
			auth: "required",
			handler: async ({ user }) => ({ id: user?.id }),
		});
		const res = await handler(makeReq() as unknown as NextRequest);
		expect(await res.json()).toEqual({ id: "u1" });
	});

	it("rejects with 401 when auth=required and no session", async () => {
		mockRequireSession.mockRejectedValue(new ApiError("unauthorized"));
		const handler = apiRoute({
			auth: "required",
			handler: async () => ({ ok: true }),
		});
		const res = await handler(makeReq() as unknown as NextRequest);
		expect(res.status).toBe(401);
		const json = await res.json();
		expect(json.code).toBe("unauthorized");
		expect(json.request_id).toBeDefined();
	});

	it("validates body with zod schema", async () => {
		const handler = apiRoute({
			body: z.object({ name: z.string().min(1) }),
			handler: async ({ body }) => ({ name: body.name }),
		});
		const res = await handler(
			makeReq({
				name: "Alice",
			}) as unknown as NextRequest,
		);
		expect(await res.json()).toEqual({ name: "Alice" });
	});

	it("returns 400 for invalid body", async () => {
		const handler = apiRoute({
			body: z.object({ name: z.string().min(1) }),
			handler: async () => ({ ok: true }),
		});
		const res = await handler(makeReq({ name: "" }) as unknown as NextRequest);
		expect(res.status).toBe(400);
		expect((await res.json()).code).toBe("validation_failed");
	});

	it("validates query with zod schema", async () => {
		const handler = apiRoute({
			query: z.object({ page: z.coerce.number().min(1) }),
			handler: async ({ query }) => ({ page: query.page }),
		});
		const res = await handler(
			makeReq(undefined, {
				page: "3",
			}) as unknown as NextRequest,
		);
		expect(await res.json()).toEqual({ page: 3 });
	});

	it("catches ApiError and formats response", async () => {
		const handler = apiRoute({
			handler: async () => {
				throw new ApiError("not_found", "Course not found");
			},
		});
		const res = await handler(makeReq() as unknown as NextRequest);
		expect(res.status).toBe(404);
		const json = await res.json();
		expect(json.code).toBe("not_found");
		expect(json.message).toBe("Course not found");
		expect(json.request_id).toMatch(/^[a-z0-9-]+$/);
	});

	it("allows handler to return a NextResponse directly", async () => {
		const { NextResponse } = await import("next/server");
		const handler = apiRoute({
			handler: async ({ req }) =>
				NextResponse.redirect(new URL("/done", req.url), 303),
		});
		const res = await handler(makeReq() as unknown as NextRequest);
		expect(res.status).toBe(303);
		expect(res.headers.get("location")).toBe("http://localhost/done");
	});
});
