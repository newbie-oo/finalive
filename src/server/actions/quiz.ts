"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getSession } from "@/server/auth-session";
import { container } from "@/server/container";

const submitSchema = z.object({
	quizId: z.string().uuid(),
	answers: z.record(z.string().uuid(), z.string().uuid()),
});

export async function submitQuizAction(formData: FormData) {
	const session = await getSession();
	if (!session?.user?.id) {
		return { ok: false, error: "unauthorized" as const };
	}

	const quizId = formData.get("quizId") as string;
	const answersJson = formData.get("answers") as string;

	let answers: Record<string, string>;
	try {
		answers = JSON.parse(answersJson);
	} catch {
		return { ok: false, error: "invalid_answers" as const };
	}

	const parsed = submitSchema.safeParse({ quizId, answers });
	if (!parsed.success) {
		return { ok: false, error: "invalid_input" as const };
	}

	const result = await container.quizService().submit({
		userId: session.user.id,
		userEmail: session.user.email,
		userRole: session.user.role,
		quizId,
		answers,
	});

	if (!result.ok) {
		return { ok: false, error: result.error };
	}

	// Invalidate any cached learn-route data (curriculum progress, quiz pass
	// status). 'layout' scope re-renders all routes under the learn segment.
	revalidatePath("/learn/[courseSlug]", "layout");

	return { ok: true, result };
}
