import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireSessionThrow, requireRoleThrow } from "@/server/auth-session";
import { ApiError, statusForCode } from "@/lib/api-error";

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

/**
 * Declarative API route wrapper that handles auth, validation, and error
 * formatting so handlers focus purely on business logic.
 *
 * Usage:
 *   export const POST = apiRoute({
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
      // ── Auth ──
      let user: ApiUser | undefined;
      if (options.auth === "admin") {
        const s = await requireRoleThrow("admin");
        user = s.user;
      } else if (options.auth === "required") {
        const s = await requireSessionThrow();
        user = s.user;
      }

      // ── Query parsing ──
      let query = {} as TQuery;
      if (options.query) {
        const url = new URL(req.url);
        const parsed = options.query.safeParse(
          Object.fromEntries(url.searchParams),
        );
        if (!parsed.success) {
          return errorResponse(
            "validation_failed",
            parsed.error.errors[0]?.message ?? "invalid query",
            400,
            rid,
          );
        }
        query = parsed.data;
      }

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

      // ── Handler ──
      const result = await options.handler({ req, user, body, query });
      if (result instanceof NextResponse) {
        return result;
      }
      return NextResponse.json(result);
    } catch (e: unknown) {
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
      throw e;
    }
  };
}
