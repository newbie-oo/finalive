import { type NextRequest, type NextResponse } from "next/server";
import { z } from "zod";
import { apiRoute, type ApiAuth, type ApiUser } from "@/lib/api-route";
import { ApiError } from "@/lib/api-error";
import {
	getCourseOwnerId,
	getCollaboratorRole,
} from "@/server/repos/course-authz";
import { canEditCoursePure } from "@/server/services/course-authz";
import type { RateLimitConfig } from "@/lib/rate-limit";

/** Course-edit access information injected into the handler. */
export interface CourseAccessContext {
	courseId: string;
	courseOwnerId: string | null;
	collaboratorRole: string | null;
}

interface ApiCourseRouteOptions<
	TBody,
	TQuery extends Record<string, unknown>,
	TResponse,
> {
	/** Auth requirement. Defaults to `"required"`. `"admin"` adds the global
	 * admin role check on top of the per-course edit check. */
	auth?: ApiAuth;
	rateLimit?: RateLimitConfig;
	body?: z.ZodSchema<TBody>;
	query?: z.ZodType<TQuery, z.ZodTypeDef, unknown>;
	/** Extract `courseId` from the parsed body or query. */
	getCourseId: (input: { body: TBody; query: TQuery }) => string;
	handler: (ctx: {
		req: NextRequest;
		user: ApiUser;
		body: TBody;
		query: TQuery;
		courseAccess: CourseAccessContext;
	}) => Promise<TResponse | NextResponse> | TResponse | NextResponse;
}

/**
 * Variant of `apiRoute()` for routes that mutate a course (or its lessons).
 * Resolves session, runs the per-course edit-access check, and injects the
 * resolved access into the handler so the route stays focused on business
 * logic. Mirrors `adminCourseAction()` for server actions.
 */
export function apiCourseRoute<
	TBody = unknown,
	TQuery extends Record<string, unknown> = Record<string, unknown>,
	TResponse = unknown,
>(options: ApiCourseRouteOptions<TBody, TQuery, TResponse>) {
	return apiRoute<TBody, TQuery, TResponse | NextResponse>({
		auth: options.auth ?? "required",
		rateLimit: options.rateLimit,
		body: options.body,
		query: options.query,
		handler: async ({ req, user, body, query }) => {
			// `auth` is forced to "required" or "admin" above, so user is always set.
			if (!user) {
				throw new ApiError("unauthorized", "auth required");
			}
			const courseId = options.getCourseId({ body, query });

			const [courseOwnerId, collaboratorRole] = await Promise.all([
				getCourseOwnerId(courseId),
				getCollaboratorRole(courseId, user.id),
			]);

			if (
				!canEditCoursePure({
					userId: user.id,
					userRole: user.role ?? "user",
					courseOwnerId,
					collaboratorRole,
				})
			) {
				throw new ApiError("forbidden", "no edit access for this course");
			}

			return options.handler({
				req,
				user,
				body,
				query,
				courseAccess: { courseId, courseOwnerId, collaboratorRole },
			});
		},
	});
}
