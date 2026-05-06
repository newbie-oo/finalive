import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";
import { UserRepo } from "@/server/repos/user";
import { ApiError } from "@/lib/api-error";

export type Role = "admin" | "user";

export interface SessionUser {
	id: string;
	email: string;
	name: string;
	role: Role;
	emailVerified: boolean;
}

export interface SessionContext {
	user: SessionUser;
	sessionId: string;
}

export type GuardStrategy =
	| { type: "redirect"; path: string }
	| { type: "throw"; status: 401 | 403; message: string };

export function normalizeRole(role: string | null | undefined): Role {
	return role === "admin" ? "admin" : "user";
}

export function getUserRole(user: unknown): string | null | undefined {
	if (typeof user !== "object" || user === null) return undefined;
	const role = (user as Record<string, unknown>).role;
	if (typeof role === "string" || role === null) return role;
	return undefined;
}

export async function getSession(): Promise<SessionContext | null> {
	const result = await auth.api.getSession({ headers: await headers() });
	if (!result?.user || !result.session) return null;

	let role = getUserRole(result.user);
	// Better Auth session may not include plugin-added fields like `role`.
	// Fall back to the database so role updates (e.g. admin promotion)
	// are reflected immediately without requiring re-login.
	if (role === undefined || role === null) {
		role = (await UserRepo.getRoleById(result.user.id)) ?? undefined;
	}

	return {
		sessionId: result.session.id,
		user: {
			id: result.user.id,
			email: result.user.email,
			name: result.user.name,
			role: normalizeRole(role),
			emailVerified: result.user.emailVerified,
		},
	};
}

/** Pure check: returns context or throws ApiError. No framework coupling. */
export function checkSession(ctx: SessionContext | null): SessionContext {
	if (!ctx) throw new ApiError("unauthorized", "Login required");
	return ctx;
}

/** Pure check: returns context or throws ApiError. No framework coupling. */
export function checkRole(ctx: SessionContext, role: Role): SessionContext {
	if (ctx.user.role !== role) throw new ApiError("forbidden", "Access denied");
	return ctx;
}

/** Adapter: decides between redirect and re-throw based on strategy. */
export function guardSession(
	ctx: SessionContext | null,
	strategy: GuardStrategy,
): SessionContext {
	try {
		return checkSession(ctx);
	} catch (e) {
		if (e instanceof ApiError) {
			if (strategy.type === "redirect") redirect(strategy.path);
			throw e;
		}
		throw e;
	}
}

/** Adapter: decides between redirect and re-throw based on strategy. */
export function guardRole(
	ctx: SessionContext,
	role: Role,
	strategy: GuardStrategy,
): SessionContext {
	try {
		return checkRole(ctx, role);
	} catch (e) {
		if (e instanceof ApiError) {
			if (strategy.type === "redirect") redirect("/403");
			throw e;
		}
		throw e;
	}
}

export async function requireSession(
	redirectTo = "/login",
): Promise<SessionContext> {
	const ctx = await getSession();
	return guardSession(ctx, { type: "redirect", path: redirectTo });
}

export async function requireRole(
	role: Role,
	redirectTo = "/login",
): Promise<SessionContext> {
	const ctx = await requireSession(redirectTo);
	return guardRole(ctx, role, { type: "redirect", path: "/403" });
}

/** API-route variants: use pure checks directly (no redirect). */
export async function requireSessionThrow(): Promise<SessionContext> {
	const ctx = await getSession();
	return checkSession(ctx);
}

export async function requireRoleThrow(role: Role): Promise<SessionContext> {
	const ctx = await requireSessionThrow();
	return checkRole(ctx, role);
}
