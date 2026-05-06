import { type NextRequest, NextResponse } from "next/server";
import { verifyCronSecret } from "@/lib/cron-auth";

function requestId(): string {
	return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

interface CronRouteOptions<TResponse = unknown> {
	handler: (ctx: {
		req: NextRequest;
	}) => Promise<TResponse | NextResponse> | TResponse | NextResponse;
}

export function cronRoute<TResponse = unknown>(
	options: CronRouteOptions<TResponse>,
) {
	return async (req: NextRequest): Promise<NextResponse> => {
		const rid = requestId();
		try {
			if (!verifyCronSecret(req.headers.get("authorization"))) {
				return NextResponse.json(
					{ error: "unauthorized", request_id: rid },
					{ status: 401 },
				);
			}
			const result = await options.handler({ req });
			if (result instanceof NextResponse) {
				return result;
			}
			return NextResponse.json(result);
		} catch (e: unknown) {
			console.error(`Cron error [${rid}]:`, e);
			const message = e instanceof Error ? e.message : "internal_error";
			return NextResponse.json(
				{ error: message, request_id: rid },
				{ status: 500 },
			);
		}
	};
}
