import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { auth } from "./auth";
import { db, schema } from "@/db/client";
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
		const [row] = await db
			.select({ role: schema.user.role })
			.from(schema.user)
			.where(eq(schema.user.id, result.user.id))
			.limit(1);
		role = row?.role ?? undefined;
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

export function guardSession(
	ctx: SessionContext | null,
	strategy: GuardStrategy,
): SessionContext {
	if (!ctx) {
		switch (strategy.type) {
			case "redirect":
				redirect(strategy.path);
			case "throw":
				throw new ApiError(
					strategy.status === 401 ? "unauthorized" : "forbidden",
					strategy.message,
				);
		}
	}
	return ctx;
}

export function guardRole(
	ctx: SessionContext,
	role: Role,
	strategy: GuardStrategy,
): SessionContext {
	if (ctx.user.role !== role) {
		switch (strategy.type) {
			case "redirect":
				redirect("/403");
			case "throw":
				throw new ApiError(
					strategy.status === 401 ? "unauthorized" : "forbidden",
					strategy.message,
				);
		}
	}
	return ctx;
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
