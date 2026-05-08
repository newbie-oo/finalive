import { describe, it, expect, vi, beforeEach } from "vitest";
import { z } from "zod";
import type { NextRequest } from "next/server";
import { apiCourseRoute } from "@/lib/api-course-route";

vi.mock("server-only", () => ({}));

const mockRequireSession = vi.fn();
const mockRequireRole = vi.fn();

vi.mock("@/server/auth-session", () => ({
	requireSessionThrow: (...args: unknown[]) => mockRequireSession(...args),
	requireRoleThrow: (...args: unknown[]) => mockRequireRole(...args),
}));

const mockGetCourseOwnerId = vi.fn();
const mockGetCollaboratorRole = vi.fn();

vi.mock("@/server/repos/course-authz", () => ({
	getCourseOwnerId: (...a: unknown[]) => mockGetCourseOwnerId(...a),
	getCollaboratorRole: (...a: unknown[]) => mockGetCollaboratorRole(...a),
}));

const COURSE_ID = "11111111-1111-1111-1111-111111111111";

function makeReq(body?: unknown): Request {
	return new Request("http://localhost/api/test", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: body ? JSON.stringify(body) : undefined,
	});
}

beforeEach(() => {
	mockRequireSession.mockReset();
	mockRequireRole.mockReset();
	mockGetCourseOwnerId.mockReset();
	mockGetCollaboratorRole.mockReset();
});

describe("apiCourseRoute", () => {
	it("injects courseAccess context when the user owns the course", async () => {
		mockRequireSession.mockResolvedValue({
			user: { id: "owner-1", email: "o@x.com", role: "user" },
		});
		mockGetCourseOwnerId.mockResolvedValue("owner-1");
		mockGetCollaboratorRole.mockResolvedValue(null);

		const handler = apiCourseRoute({
			body: z.object({ courseId: z.string().uuid() }),
			getCourseId: ({ body }) => body.courseId,
			handler: async ({ courseAccess }) => courseAccess,
		});

		const res = await handler(
			makeReq({ courseId: COURSE_ID }) as unknown as NextRequest,
		);

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({
			courseId: COURSE_ID,
			courseOwnerId: "owner-1",
			collaboratorRole: null,
		});
	});

	it("returns 403 when the user has no edit access", async () => {
		mockRequireSession.mockResolvedValue({
			user: { id: "stranger", email: "s@x.com", role: "user" },
		});
		mockGetCourseOwnerId.mockResolvedValue("owner-1");
		mockGetCollaboratorRole.mockResolvedValue(null);

		const handler = apiCourseRoute({
			body: z.object({ courseId: z.string().uuid() }),
			getCourseId: ({ body }) => body.courseId,
			handler: async () => ({ ok: true }),
		});

		const res = await handler(
			makeReq({ courseId: COURSE_ID }) as unknown as NextRequest,
		);

		expect(res.status).toBe(403);
		expect((await res.json()).code).toBe("forbidden");
	});

	it("admin role bypasses the course-edit check", async () => {
		mockRequireRole.mockResolvedValue({
			user: { id: "admin-1", email: "a@x.com", role: "admin" },
		});
		mockGetCourseOwnerId.mockResolvedValue("someone-else");
		mockGetCollaboratorRole.mockResolvedValue(null);

		const handler = apiCourseRoute({
			auth: "admin",
			body: z.object({ courseId: z.string().uuid() }),
			getCourseId: ({ body }) => body.courseId,
			handler: async () => ({ ok: true }),
		});

		const res = await handler(
			makeReq({ courseId: COURSE_ID }) as unknown as NextRequest,
		);

		expect(res.status).toBe(200);
		expect(await res.json()).toEqual({ ok: true });
	});

	it("returns 400 when body validation fails before the access check", async () => {
		mockRequireSession.mockResolvedValue({
			user: { id: "u", email: "u@x.com", role: "user" },
		});

		const handler = apiCourseRoute({
			body: z.object({ courseId: z.string().uuid() }),
			getCourseId: ({ body }) => body.courseId,
			handler: async () => ({ ok: true }),
		});

		const res = await handler(
			makeReq({ courseId: "not-a-uuid" }) as unknown as NextRequest,
		);

		expect(res.status).toBe(400);
		expect(mockGetCourseOwnerId).not.toHaveBeenCalled();
	});

	it("editor collaborator role grants edit access", async () => {
		mockRequireSession.mockResolvedValue({
			user: { id: "u-editor", email: "e@x.com", role: "user" },
		});
		mockGetCourseOwnerId.mockResolvedValue("someone-else");
		mockGetCollaboratorRole.mockResolvedValue("editor");

		const handler = apiCourseRoute({
			body: z.object({ courseId: z.string().uuid() }),
			getCourseId: ({ body }) => body.courseId,
			handler: async ({ courseAccess }) => courseAccess,
		});

		const res = await handler(
			makeReq({ courseId: COURSE_ID }) as unknown as NextRequest,
		);

		expect(res.status).toBe(200);
		expect((await res.json()).collaboratorRole).toBe("editor");
	});
});
