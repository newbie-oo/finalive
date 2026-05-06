import "server-only";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { getSession } from "@/server/auth-session";
import { canEditCoursePure } from "@/server/services/course-authz";
import { getAdminCourseById } from "@/server/repos/admin-course";
import { db } from "@/db/client";
import { courseCollaborator } from "@/db/schema/course";
import type { SessionContext } from "@/server/auth-session";
import { parseFormData } from "@/lib/form-data";

export type AdminResult<T> =
	| { ok: true; session: SessionContext; data: T }
	| {
			ok: false;
			error: "unauthorized" | "forbidden" | "not_found" | "invalid_input";
	  };

export async function requireAdminSession(): Promise<
	{ ok: true; session: SessionContext } | { ok: false; error: "unauthorized" }
> {
	const session = await getSession();
	if (!session?.user?.id) {
		return { ok: false, error: "unauthorized" };
	}
	return { ok: true, session };
}

/** Require an admin-level session (role === "admin"). */
export async function requireAdmin(): Promise<
	| { ok: true; session: SessionContext }
	| { ok: false; error: "unauthorized" | "forbidden" }
> {
	const auth = await requireAdminSession();
	if (!auth.ok) return auth;
	if (auth.session.user.role !== "admin") {
		return { ok: false, error: "forbidden" };
	}
	return { ok: true, session: auth.session };
}

/* ─── Parsers ─── */

export type ParseResult<T> =
	| { ok: true; data: T }
	| { ok: false; error: string };

/** Parse FormData through a Zod schema. */
export function formDataParser<T>(schema: z.ZodSchema<T>) {
	return (raw: unknown): ParseResult<T> => {
		if (!(raw instanceof FormData)) {
			return { ok: false, error: "invalid_input" };
		}
		return parseFormData(raw, schema);
	};
}

/** Parse a plain object through a Zod schema. */
export function jsonParser<T>(schema: z.ZodSchema<T>) {
	return (raw: unknown): ParseResult<T> => {
		const parsed = schema.safeParse(raw);
		if (!parsed.success) return { ok: false, error: "invalid_input" };
		return { ok: true, data: parsed.data };
	};
}

/* ─── Action wrappers ─── */

export type AdminActionResult<T extends Record<string, unknown>> =
	| ({ ok: true } & T)
	| { ok: false; error: string; errors?: string[] };

/** Wrap an admin-only action (no course access needed). */
export function adminAction<TInput, TOutput extends Record<string, unknown>>(
	parser: (raw: unknown) => ParseResult<TInput>,
	handler: (ctx: {
		session: SessionContext;
		input: TInput;
	}) => Promise<TOutput> | TOutput,
): (raw: unknown) => Promise<AdminActionResult<TOutput>> {
	return async (raw) => {
		const auth = await requireAdmin();
		if (!auth.ok) return { ok: false, error: auth.error };

		const parsed = parser(raw);
		if (!parsed.ok) return { ok: false, error: parsed.error };

		const data = await handler({ session: auth.session, input: parsed.data });
		if (data.ok === false) {
			return data as AdminActionResult<TOutput>;
		}
		return { ok: true, ...data };
	};
}

/** Wrap an admin action that also requires course edit access. */
export function adminCourseAction<
	TInput,
	TOutput extends Record<string, unknown>,
>(
	parser: (raw: unknown) => ParseResult<TInput>,
	getCourseId: (input: TInput) => string,
	handler: (ctx: {
		session: SessionContext;
		course: NonNullable<Awaited<ReturnType<typeof getAdminCourseById>>>;
		input: TInput;
	}) => Promise<TOutput> | TOutput,
): (raw: unknown) => Promise<AdminActionResult<TOutput>> {
	return async (raw) => {
		const auth = await requireAdmin();
		if (!auth.ok) return { ok: false, error: auth.error };

		const parsed = parser(raw);
		if (!parsed.ok) return { ok: false, error: parsed.error };

		const access = await requireCourseAccess(
			auth.session,
			getCourseId(parsed.data),
		);
		if (!access.ok) return { ok: false, error: access.error };

		const data = await handler({
			session: auth.session,
			course: access.course,
			input: parsed.data,
		});
		if (data.ok === false) {
			return data as AdminActionResult<TOutput>;
		}
		return { ok: true, ...data };
	};
}

export async function requireCourseAccess(
	session: SessionContext,
	courseId: string,
): Promise<
	| {
			ok: true;
			course: NonNullable<Awaited<ReturnType<typeof getAdminCourseById>>>;
	  }
	| { ok: false; error: "not_found" | "forbidden" }
> {
	// Parallelize course fetch + collaborator lookup.
	const [course, collabRows] = await Promise.all([
		getAdminCourseById(courseId),
		db
			.select({ role: courseCollaborator.role })
			.from(courseCollaborator)
			.where(
				and(
					eq(courseCollaborator.courseId, courseId),
					eq(courseCollaborator.userId, session.user.id),
				),
			)
			.limit(1),
	]);

	if (!course) {
		return { ok: false, error: "not_found" };
	}

	const editable = canEditCoursePure({
		userId: session.user.id,
		userRole: session.user.role,
		courseOwnerId: course.ownerUserId,
		collaboratorRole: collabRows[0]?.role ?? null,
	});

	if (!editable) {
		return { ok: false, error: "forbidden" };
	}

	return { ok: true, course };
}

export function revalidateCourseAdminPaths(
	courseId: string,
	slug?: string | null,
): void {
	revalidatePath("/admin/courses");
	revalidatePath(`/admin/courses/${courseId}`);
	revalidatePath(`/admin/courses/${courseId}/curriculum`);
	if (slug) {
		revalidatePath(`/courses/${slug}`);
		revalidatePath("/courses");
	}
}
