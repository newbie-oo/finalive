import { z } from "zod";
import { apiRoute } from "@/lib/api-route";
import { getEnv } from "@/lib/env";
import { rateLimitConfigs } from "@/lib/rate-limit";
import { makeBunnyStatusService } from "@/server/services/bunny-status-service-factory";
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
			return { error: "Bunny not configured" };
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
			return { error: `Bunny API error: ${res.status} ${text}` };
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
			const service = makeBunnyStatusService();
			await service.sync(query.videoId, data.status, durationSeconds);
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
