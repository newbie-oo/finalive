"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCourseIdByLessonId } from "@/server/repos/course";
import {
	getAdminQuizById,
	saveAdminQuiz,
	createAdminQuiz,
	type AdminQuiz,
} from "@/server/repos/admin-quiz";
import {
	requireAdminSession,
	requireCourseAccess,
} from "@/server/admin/admin-command";
const saveQuizSchema = z.object({
	quizId: z.string().uuid(),
	passScorePct: z.number().int().min(1).max(100).default(60),
	questions: z
		.array(
			z.object({
				id: z.string().uuid().optional(),
				promptMd: z.string().min(1).max(2000),
				choices: z
					.array(
						z.object({
							id: z.string().uuid().optional(),
							body: z.string().min(1).max(500),
							isCorrect: z.boolean(),
						}),
					)
					.min(2)
					.max(6),
			}),
		)
		.min(1)
		.max(50),
});

type SaveQuizResult =
	| { ok: true; quiz: AdminQuiz }
	| {
			ok: false;
			error: "unauthorized" | "invalid_input" | "not_found" | "forbidden";
	  };

export async function saveQuizAction(
	input: z.infer<typeof saveQuizSchema>,
): Promise<SaveQuizResult> {
	const auth = await requireAdminSession();
	if (!auth.ok) return { ok: false, error: auth.error };

	const parsed = saveQuizSchema.safeParse(input);
	if (!parsed.success) {
		return { ok: false, error: "invalid_input" };
	}

	const quiz = await getAdminQuizById(parsed.data.quizId);
	if (!quiz) {
		return { ok: false, error: "not_found" };
	}

	const access = await requireCourseAccess(auth.session, quiz.courseId);
	if (!access.ok) return { ok: false, error: access.error };

	await saveAdminQuiz(parsed.data.quizId, {
		passScorePct: parsed.data.passScorePct,
		questions: parsed.data.questions,
	});

	const fresh = await getAdminQuizById(parsed.data.quizId);
	if (!fresh) {
		return { ok: false, error: "not_found" };
	}

	revalidatePath(`/admin/courses/${quiz.courseId}/quizzes/${quiz.id}`);
	revalidatePath(`/admin/courses/${quiz.courseId}/curriculum`);

	return { ok: true, quiz: fresh };
}

const createQuizSchema = z.object({
	lessonId: z.string().uuid(),
	title: z.string().min(1).max(200),
	passScorePct: z.number().int().min(1).max(100).default(60),
});

export async function createQuizAction(
	input: z.infer<typeof createQuizSchema>,
) {
	const auth = await requireAdminSession();
	if (!auth.ok) return { ok: false, error: auth.error } as const;

	const parsed = createQuizSchema.safeParse(input);
	if (!parsed.success) {
		return { ok: false, error: "invalid_input" as const };
	}

	const courseId = await getCourseIdByLessonId(parsed.data.lessonId);
	if (!courseId) {
		return { ok: false, error: "not_found" as const };
	}

	const access = await requireCourseAccess(auth.session, courseId);
	if (!access.ok) return { ok: false, error: access.error } as const;

	const quizId = await createAdminQuiz({
		lessonId: parsed.data.lessonId,
		title: parsed.data.title,
		passScorePct: parsed.data.passScorePct,
		createdByUserId: auth.session.user.id,
	});

	revalidatePath(`/admin/courses/${courseId}/curriculum`);
	return { ok: true, quizId };
}
