import { z } from "zod";
import { apiRoute } from "@/lib/api-route";
import { rateLimitConfigs } from "@/lib/rate-limit";
import { upsertLessonProgress } from "@/server/repos/progress";

const body = z.object({ lessonId: z.string().uuid() });

export const POST = apiRoute({
	auth: "required",
	body,
	rateLimit: rateLimitConfigs.api,
	handler: async ({ body, user }) => {
		if (user!.role === "admin") {
			return { ok: true, ignored: "admin_preview" };
		}
		await upsertLessonProgress(user!.id, body.lessonId);
		return { ok: true };
	},
});
