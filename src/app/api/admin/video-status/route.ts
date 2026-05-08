import { z } from "zod";
import { apiRoute } from "@/lib/api-route";
import { ApiError } from "@/lib/api-error";
import { getEnv } from "@/lib/env";
import { rateLimitConfigs } from "@/lib/rate-limit";
import { container } from "@/server/container";
import { bunnyStatusName } from "@/server/services/bunny-video-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const query = z.object({ videoId: z.string().min(1) });

export const GET = apiRoute({
	auth: "admin",
	rateLimit: rateLimitConfigs.api,
	query,
	handler: async ({ query }) => {
		const env = getEnv();
		const libraryId = env.BUNNY_LIBRARY_ID;
		const apiKey = env.BUNNY_API_KEY;

		if (!libraryId || !apiKey) {
			throw new ApiError("internal_error", "Bunny stream is not configured");
		}

		const res = await fetch(
			`https://video.bunnycdn.com/library/${libraryId}/videos/${query.videoId}`,
			{
				headers: {
					Accept: "application/json",
					AccessKey: apiKey,
				},
				cache: "no-store",
			},
		);

		if (!res.ok) {
			const text = await res.text().catch(() => "unknown");
			throw new ApiError(
				"internal_error",
				`Bunny upstream failure: ${res.status} ${text}`,
			);
		}

		const data = (await res.json()) as {
			guid: string;
			title: string;
			status: number;
			length?: number;
		};

		const isReady = data.status === 4;
		const durationSeconds =
			typeof data.length === "number" ? Math.round(data.length) : null;

		if (isReady) {
			await container.bunnyStatus().sync(query.videoId, data.status, durationSeconds);
		}

		return {
			videoId: data.guid,
			title: data.title,
			status: bunnyStatusName(data.status),
			statusCode: data.status,
			isReady,
			durationSeconds,
		};
	},
});
