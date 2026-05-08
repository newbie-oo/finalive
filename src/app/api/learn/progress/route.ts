import { z } from "zod";
import { apiRoute } from "@/lib/api-route";
import { updateWatchedSeconds } from "@/server/repos/progress";
import { container } from "@/server/container";
import { rateLimitConfigs } from "@/lib/rate-limit";

const schema = z.object({
	lessonId: z.string().uuid(),
	watchedSeconds: z.number().int().min(0),
	markComplete: z.boolean().optional(),
	durationSeconds: z.number().int().min(0).optional(),
});

export const POST = apiRoute({
	auth: "required",
	rateLimit: rateLimitConfigs.api,
	body: schema,
	handler: async ({ body, user }) => {
		// Admin previews must not record progress — otherwise an admin walking
		// through a course would auto-complete and trigger a certificate flow
		// they can never redeem.
		if (user!.role === "admin") {
			return { ok: true, ignored: "admin_preview" };
		}

		const { lessonId, watchedSeconds, markComplete, durationSeconds } = body;

		if (markComplete) {
			const service = container.courseCompletion();
			const result = await service.handleLessonComplete({
				userId: user!.id,
				userEmail: user!.email,
				userRole: user!.role,
				lessonId,
				durationSeconds,
			});
			return { ok: true, ...result };
		}

		await updateWatchedSeconds(user!.id, lessonId, watchedSeconds);
		return { ok: true, completed: false };
	},
});
