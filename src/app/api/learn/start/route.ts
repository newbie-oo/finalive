import { z } from "zod";
import { apiRoute } from "@/lib/api-route";
import { rateLimitConfigs } from "@/lib/rate-limit";
import { upsertLessonProgress } from "@/server/repos/progress";
import { isAdmin } from "@/lib/auth-utils";
import { assertCanWriteLessonProgress } from "@/server/services/lesson-progress-authz";

const body = z.object({ lessonId: z.string().uuid() });

export const POST = apiRoute({
	auth: "required",
	body,
	rateLimit: rateLimitConfigs.api,
	handler: async ({ body, user }) => {
		if (isAdmin(user)) {
			return { ok: true, ignored: "admin_preview" };
		}
		await assertCanWriteLessonProgress({
			userId: user!.id,
			userRole: user!.role,
			lessonId: body.lessonId,
		});
		await upsertLessonProgress(user!.id, body.lessonId);
		return { ok: true };
	},
});
