import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionThrow, requireRoleThrow } from "@/server/auth-session";
import { ApiError, statusForCode } from "@/lib/api-error";
import { thaiErrorMessage } from "@/lib/error-messages";
import {
	checkRateLimit,
	getClientIP,
	type RateLimitConfig,
} from "@/lib/rate-limit";

function checkRateLimitOrThrow(
	req: NextRequest,
	config: RateLimitConfig | undefined,
	_rid: string,
): void {
	if (!config) return;
	const ip = getClientIP(req);
	const result = checkRateLimit(ip, req.url, config);
	if (!result.allowed) {
		throw new ApiError(
			"rate_limited",
			`Rate limit exceeded. Retry after ${result.resetAt}.`,
		);
	}
}

/** Auth requirement for an API route. */
export type ApiAuth = "required" | "admin";

/** User context injected by the wrapper after auth. */
export interface ApiUser {
	id: string;
	email: string;
	role?: string;
}

interface ApiRouteOptions<
	TBody = unknown,
	TQuery extends Record<string, unknown> = Record<string, unknown>,
	TResponse = unknown,
> {
	/** Auth requirement. Omit for public routes. */
	auth?: ApiAuth;
	/** Rate-limit config. Checked before auth to avoid burning session lookups. */
	rateLimit?: RateLimitConfig;
	/** Zod schema for JSON body. Omit for routes that don't parse JSON. */
	body?: z.ZodSchema<TBody>;
	/** Zod schema for query params. Omit for routes without query validation. */
	query?: z.ZodType<TQuery, z.ZodTypeDef, unknown>;
	/**
	 * Business logic handler. Receives parsed input and user context.
	 * Return a JSON-serializable object or a NextResponse for full control.
	 */
	handler: (ctx: {
		req: NextRequest;
		user: ApiUser | undefined;
		body: TBody;
		query: TQuery;
	}) => Promise<TResponse | NextResponse> | TResponse | NextResponse;
}

interface ApiRouteRawOptions<
	TQuery extends Record<string, unknown> = Record<string, unknown>,
	TResponse = unknown,
> {
	/** Auth requirement. Omit for public routes. */
	auth?: ApiAuth;
	/** Rate-limit config. Checked before auth to avoid burning session lookups. */
	rateLimit?: RateLimitConfig;
	/** Zod schema for query params. Omit for routes without query validation. */
	query?: z.ZodType<TQuery, z.ZodTypeDef, unknown>;
	/**
	 * Business logic handler. Receives the raw request and user context.
	 * The handler is responsible for parsing its own body (FormData, etc.).
	 * Return a JSON-serializable object or a NextResponse for full control.
	 */
	handler: (ctx: {
		req: NextRequest;
		user: ApiUser | undefined;
		query: TQuery;
	}) => Promise<TResponse | NextResponse> | TResponse | NextResponse;
}

function requestId(): string {
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function errorResponse(
	code: string,
	message: string,
	status: number,
	rid: string,
) {
	return NextResponse.json({ code, message, request_id: rid }, { status });
}

async function resolveAuth(
	auth: ApiAuth | undefined,
): Promise<ApiUser | undefined> {
	if (auth === "admin") {
		const s = await requireRoleThrow("admin");
		return s.user;
	}
	if (auth === "required") {
		const s = await requireSessionThrow();
		return s.user;
	}
	return undefined;
}

function resolveQuery<TQuery extends Record<string, unknown>>(
	req: NextRequest,
	schema: z.ZodType<TQuery, z.ZodTypeDef, unknown> | undefined,
	rid: string,
): { ok: true; data: TQuery } | { ok: false; response: NextResponse } {
	if (!schema) return { ok: true, data: {} as TQuery };
	const url = new URL(req.url);
	const parsed = schema.safeParse(Object.fromEntries(url.searchParams));
	if (!parsed.success) {
		return {
			ok: false,
			response: errorResponse(
				"validation_failed",
				parsed.error.errors[0]?.message ?? "invalid query",
				400,
				rid,
			),
		};
	}
	return { ok: true, data: parsed.data };
}

function wrapResult<T>(result: T | NextResponse): NextResponse {
	if (result instanceof NextResponse) {
		return result;
	}
	return NextResponse.json(result);
}

function handleApiError(e: unknown, rid: string): NextResponse {
	if (e instanceof ApiError) {
		return NextResponse.json(
			{ code: e.code, message: e.message, request_id: rid },
			{ status: statusForCode(e.code) },
		);
	}
	if (e instanceof z.ZodError) {
		return errorResponse(
			"validation_failed",
			e.errors[0]?.message ?? "validation failed",
			400,
			rid,
		);
	}
	console.error(`API error [${rid}]:`, e);
	return errorResponse(
		"internal_error",
		thaiErrorMessage("internal_error"),
		500,
		rid,
	);
}

/**
 * Declarative API route wrapper that handles auth, validation, and error
 * formatting so handlers focus purely on business logic.
 *
 * **Return value contract:**
 * - Returning a plain object → wrapped in `NextResponse.json()` with standard
 *   headers and request_id injection.
 * - Returning `NextResponse` directly → passed through unchanged. This escape
 *   hatch is intentional for routes that need custom response shapes
 *   (redirects, raw binary, streaming). Use it sparingly — most routes should
 *   return plain objects so cross-cutting concerns are handled uniformly.
 *
 * Usage:
 *   const POST = apiRoute({
 *     auth: "required",
 *     body: z.object({ lessonId: z.string().uuid() }),
 *     handler: async ({ body, user }) => { … }
 *   });
 */
export function apiRoute<
	TBody = unknown,
	TQuery extends Record<string, unknown> = Record<string, unknown>,
	TResponse = unknown,
>(options: ApiRouteOptions<TBody, TQuery, TResponse>) {
	return async (req: NextRequest): Promise<NextResponse> => {
		const rid = requestId();
		try {
			checkRateLimitOrThrow(req, options.rateLimit, rid);
			const user = await resolveAuth(options.auth);

			const qResult = resolveQuery(req, options.query, rid);
			if (!qResult.ok) return qResult.response;
			const query = qResult.data;

			// ── Body parsing ──
			let body = {} as TBody;
			if (options.body) {
				let raw: unknown;
				try {
					raw = await req.json();
				} catch {
					return errorResponse(
						"validation_failed",
						"invalid JSON body",
						400,
						rid,
					);
				}
				const parsed = options.body.safeParse(raw);
				if (!parsed.success) {
					return errorResponse(
						"validation_failed",
						parsed.error.errors[0]?.message ?? "invalid body",
						400,
						rid,
					);
				}
				body = parsed.data;
			}

			const result = await options.handler({ req, user, body, query });
			return wrapResult(result);
		} catch (e: unknown) {
			return handleApiError(e, rid);
		}
	};
}

/**
 * Variant of apiRoute for handlers that parse their own body
 * (e.g. FormData, multipart uploads). Skips JSON body parsing.
 *
 * **Return value contract:** same as `apiRoute` — plain objects are wrapped,
 * `NextResponse` is passed through.
 *
 * Usage:
 *   const POST = apiRouteRaw({
 *     auth: "required",
 *     handler: async ({ req, user }) => {
 *       const formData = await req.formData();
 *       …
 *     }
 *   });
 */
export function apiRouteRaw<
	TQuery extends Record<string, unknown> = Record<string, unknown>,
	TResponse = unknown,
>(options: ApiRouteRawOptions<TQuery, TResponse>) {
	return async (req: NextRequest): Promise<NextResponse> => {
		const rid = requestId();
		try {
			checkRateLimitOrThrow(req, options.rateLimit, rid);
			const user = await resolveAuth(options.auth);

			const qResult = resolveQuery(req, options.query, rid);
			if (!qResult.ok) return qResult.response;
			const query = qResult.data;

			const result = await options.handler({ req, user, query });
			return wrapResult(result);
		} catch (e: unknown) {
			return handleApiError(e, rid);
		}
	};
}
