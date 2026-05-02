import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const redirectMock = vi.fn((url: string) => {
	throw new Error(`__redirect:${url}`);
});

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

// Avoid pulling the real db client (which calls getEnv() at import time)
// when this test runs in the unit test pool — the role-fallback path that
// uses `db` is never hit because every test scenario below already supplies
// a role on the mocked session user.
vi.mock("@/db/client", () => ({
	db: {
		select: () => ({
			from: () => ({
				where: () => ({ limit: async () => [] }),
			}),
		}),
	},
	schema: { user: { id: "id", role: "role" } },
}));

const getSessionApi = vi.fn();
vi.mock("./auth", () => ({
	auth: { api: { getSession: getSessionApi } },
}));

beforeEach(() => {
	redirectMock.mockClear();
	getSessionApi.mockReset();
});

describe("auth-session", () => {
	it("getSession returns null when no user", async () => {
		getSessionApi.mockResolvedValue(null);
		const { getSession } = await import("./auth-session");
		expect(await getSession()).toBeNull();
	});

	it("requireSession redirects to /login when missing", async () => {
		getSessionApi.mockResolvedValue(null);
		const { requireSession } = await import("./auth-session");
		await expect(requireSession()).rejects.toThrow("__redirect:/login");
		expect(redirectMock).toHaveBeenCalledWith("/login");
	});

	it("requireRole('admin') redirects to /403 when role mismatches", async () => {
		getSessionApi.mockResolvedValue({
			session: { id: "s1" },
			user: {
				id: "u1",
				email: "x@y",
				name: "X",
				role: "user",
				emailVerified: true,
			},
		});
		const { requireRole } = await import("./auth-session");
		await expect(requireRole("admin")).rejects.toThrow("__redirect:/403");
	});

	it("requireRole('admin') passes for admin user", async () => {
		getSessionApi.mockResolvedValue({
			session: { id: "s2" },
			user: {
				id: "u2",
				email: "a@b",
				name: "A",
				role: "admin",
				emailVerified: true,
			},
		});
		const { requireRole } = await import("./auth-session");
		const ctx = await requireRole("admin");
		expect(ctx.user.role).toBe("admin");
		expect(redirectMock).not.toHaveBeenCalled();
	});
});

describe("guardSession", () => {
	it("returns context when session exists", async () => {
		const { guardSession } = await import("./auth-session");
		const ctx = {
			sessionId: "s1",
			user: {
				id: "u1",
				email: "x@y",
				name: "X",
				role: "user" as const,
				emailVerified: true,
			},
		};
		const result = guardSession(ctx, {
			type: "throw",
			status: 401,
			message: "Login required",
		});
		expect(result).toBe(ctx);
	});

	it("throws ApiError when session missing with throw strategy", async () => {
		const { guardSession } = await import("./auth-session");
		expect(() =>
			guardSession(null, {
				type: "throw",
				status: 401,
				message: "Login required",
			}),
		).toThrow("Login required");
	});

	it("redirects when session missing with redirect strategy", async () => {
		const { guardSession } = await import("./auth-session");
		expect(() =>
			guardSession(null, { type: "redirect", path: "/login" }),
		).toThrow("__redirect:/login");
		expect(redirectMock).toHaveBeenCalledWith("/login");
	});
});

describe("guardRole", () => {
	it("returns context when role matches", async () => {
		const { guardRole } = await import("./auth-session");
		const ctx = {
			sessionId: "s1",
			user: {
				id: "u1",
				email: "x@y",
				name: "X",
				role: "admin" as const,
				emailVerified: true,
			},
		};
		const result = guardRole(ctx, "admin", {
			type: "throw",
			status: 403,
			message: "Forbidden",
		});
		expect(result).toBe(ctx);
	});

	it("throws ApiError when role mismatches with throw strategy", async () => {
		const { guardRole } = await import("./auth-session");
		const ctx = {
			sessionId: "s1",
			user: {
				id: "u1",
				email: "x@y",
				name: "X",
				role: "user" as const,
				emailVerified: true,
			},
		};
		expect(() =>
			guardRole(ctx, "admin", {
				type: "throw",
				status: 403,
				message: "Forbidden",
			}),
		).toThrow("Forbidden");
	});

	it("redirects when role mismatches with redirect strategy", async () => {
		const { guardRole } = await import("./auth-session");
		const ctx = {
			sessionId: "s1",
			user: {
				id: "u1",
				email: "x@y",
				name: "X",
				role: "user" as const,
				emailVerified: true,
			},
		};
		expect(() =>
			guardRole(ctx, "admin", { type: "redirect", path: "/403" }),
		).toThrow("__redirect:/403");
		expect(redirectMock).toHaveBeenCalledWith("/403");
	});
});
