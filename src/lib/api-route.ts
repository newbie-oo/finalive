import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionThrow, requireRoleThrow } from "@/server/auth-session";
import { ApiError, statusForCode } from "@/lib/api-error";
import { thaiErrorMessage } from "@/lib/error-messages";
import { logger } from "@/lib/logger";
import {
	checkRateLimit,
	getClientIP,
	type RateLimitConfig,
} from "@/lib/rate-limit";

/* ─── Shared utilities ─── */

export function requestId(): string {
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function errorResponse(
	code: string,
	message: string,
	status: number,
	rid: string,
) {
	return NextResponse.json({ code, message, request_id: rid }, { status });
}

export function wrapResult<T>(result: T | NextResponse): NextResponse {
	if (result instanceof NextResponse) {
		return result;
	}
	return NextResponse.json(result);
}

export function handleApiError(e: unknown, rid: string): NextResponse {
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
	logger.error("api.unhandled_error", e, { requestId: rid });
	return errorResponse(
		"internal_error",
		thaiErrorMessage("internal_error"),
		500,
		rid,
	);
}

/* ─── Middleware primitives ─── */

/** Auth requirement for an API route. */
export type ApiAuth = "required" | "admin";

/** User context injected by the wrapper after auth. */
export interface ApiUser {
	id: string;
	email: string;
	role?: string;
}

export async function resolveAuth(
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

export function checkRateLimitOrThrow(
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

export function resolveQuery<TQuery extends Record<string, unknown>>(
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

export async function resolveBody<TBody>(
	req: NextRequest,
	schema: z.ZodSchema<TBody>,
	rid: string,
): Promise<{ ok: true; data: TBody } | { ok: false; response: NextResponse }> {
	let raw: unknown;
	try {
		raw = await req.json();
	} catch {
		return {
			ok: false,
			response: errorResponse(
				"validation_failed",
				"invalid JSON body",
				400,
				rid,
			),
		};
	}
	const parsed = schema.safeParse(raw);
	if (!parsed.success) {
		return {
			ok: false,
			response: errorResponse(
				"validation_failed",
				parsed.error.errors[0]?.message ?? "invalid body",
				400,
				rid,
			),
		};
	}
	return { ok: true, data: parsed.data };
}

/* ─── Pipeline builder ─── */

interface PipelineCtx<
	TBody = unknown,
	TQuery extends Record<string, unknown> = Record<string, unknown>,
> {
	req: NextRequest;
	user: ApiUser | undefined;
	body: TBody;
	query: TQuery;
}

interface PipelineOptions<
	TBody = unknown,
	TQuery extends Record<string, unknown> = Record<string, unknown>,
> {
	auth?: ApiAuth;
	rateLimit?: RateLimitConfig;
	body?: z.ZodSchema<TBody>;
	query?: z.ZodType<TQuery, z.ZodTypeDef, unknown>;
}

/**
 * Build the common API pipeline: rate-limit → auth → query → body (optional).
 * Returns the populated context or an error response.
 */
export async function buildPipeline<
	TBody = unknown,
	TQuery extends Record<string, unknown> = Record<string, unknown>,
>(
	req: NextRequest,
	options: PipelineOptions<TBody, TQuery>,
	rid: string,
): Promise<
	{ ok: true; ctx: PipelineCtx<TBody, TQuery> } | { ok: false; response: NextResponse }
> {
	try {
		checkRateLimitOrThrow(req, options.rateLimit, rid);
		const user = await resolveAuth(options.auth);

		const qResult = resolveQuery(req, options.query, rid);
		if (!qResult.ok) return qResult;

		let body = {} as TBody;
		if (options.body) {
			const bResult = await resolveBody(req, options.body, rid);
			if (!bResult.ok) return bResult;
			body = bResult.data;
		}

		return { ok: true, ctx: { req, user, body, query: qResult.data } };
	} catch (e: unknown) {
		return { ok: false, response: handleApiError(e, rid) };
	}
}

/* ─── Route wrappers ─── */

interface ApiRouteOptions<
	TBody = unknown,
	TQuery extends Record<string, unknown> = Record<string, unknown>,
	TResponse = unknown,
> extends PipelineOptions<TBody, TQuery> {
	handler: (ctx: PipelineCtx<TBody, TQuery>) =>
		Promise<TResponse | NextResponse> | TResponse | NextResponse;
}

interface ApiRouteRawOptions<
	TQuery extends Record<string, unknown> = Record<string, unknown>,
	TResponse = unknown,
> extends Omit<PipelineOptions<never, TQuery>, "body"> {
	handler: (ctx: Omit<PipelineCtx<never, TQuery>, "body">) =>
		Promise<TResponse | NextResponse> | TResponse | NextResponse;
}

/**
 * Declarative API route wrapper that handles auth, validation, and error
 * formatting so handlers focus purely on business logic.
 */
export function apiRoute<
	TBody = unknown,
	TQuery extends Record<string, unknown> = Record<string, unknown>,
	TResponse = unknown,
>(options: ApiRouteOptions<TBody, TQuery, TResponse>) {
	return async (req: NextRequest): Promise<NextResponse> => {
		const rid = requestId();
		const pipe = await buildPipeline<TBody, TQuery>(req, options, rid);
		if (!pipe.ok) return pipe.response;

		try {
			const result = await options.handler(pipe.ctx);
			return wrapResult(result);
		} catch (e: unknown) {
			return handleApiError(e, rid);
		}
	};
}

/**
 * Variant of apiRoute for handlers that parse their own body
 * (e.g. FormData, multipart uploads). Skips JSON body parsing.
 */
export function apiRouteRaw<
	TQuery extends Record<string, unknown> = Record<string, unknown>,
	TResponse = unknown,
>(options: ApiRouteRawOptions<TQuery, TResponse>) {
	return async (req: NextRequest): Promise<NextResponse> => {
		const rid = requestId();
		const pipe = await buildPipeline<never, TQuery>(
			req,
			{ auth: options.auth, rateLimit: options.rateLimit, query: options.query },
			rid,
		);
		if (!pipe.ok) return pipe.response;

		try {
			const { body: _body, ...ctxNoBody } = pipe.ctx;
			const result = await options.handler(ctxNoBody);
			return wrapResult(result);
		} catch (e: unknown) {
			return handleApiError(e, rid);
		}
	};
}
