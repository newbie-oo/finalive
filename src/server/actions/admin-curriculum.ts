"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import {
	createAdminModule,
	createAdminLesson,
	updateAdminLesson,
	updateAdminModule,
	deleteAdminModule,
	deleteAdminLesson,
	moduleExistsInCourse,
	lessonExistsInCourse,
} from "@/server/repos/admin-curriculum";
import {
	reorderAdminModules,
	reorderAdminLessons,
} from "@/server/repos/reorder";
import { getCourseCurriculum } from "@/server/repos/course";
import { getAdminCourseById } from "@/server/repos/admin-course";
import { createCurriculumAdminService } from "@/server/services/curriculum-admin";
import {
	adminCourseAction,
	jsonParser,
	revalidateCourseAdminPaths,
} from "@/server/admin/admin-command";
import type { SessionContext } from "@/server/auth-session";

const svc = createCurriculumAdminService({
	getCourseCurriculum: (courseId) =>
		getCourseCurriculum(courseId, { includeEmptyModules: true }),
	moduleExistsInCourse,
	lessonExistsInCourse,
	createAdminModule,
	createAdminLesson,
	updateAdminModule,
	updateAdminLesson,
	deleteAdminModule,
	deleteAdminLesson,
	reorderAdminModules,
	reorderAdminLessons,
});

type AdminCourse = NonNullable<Awaited<ReturnType<typeof getAdminCourseById>>>;

/**
 * Higher-order wrapper for curriculum-mutating actions.
 *
 * Composes `adminCourseAction` (auth + course access) with the common
 * schema + courseId extractor so each individual action is a declarative
 * 3-tuple: schema, execute, revalidate.
 */
function curriculumAction<
	TInput extends { courseId: string },
	TOutput extends Record<string, unknown>,
>(
	schema: z.ZodSchema<TInput>,
	execute: (ctx: {
		input: TInput;
		session: SessionContext;
	}) => Promise<TOutput | { ok: false; error: string }>,
	revalidate: (ctx: { input: TInput; course: AdminCourse }) => void,
) {
	return adminCourseAction(
		jsonParser(schema),
		(input) => input.courseId,
		async ({ input, course, session }) => {
			const result = await execute({ input, session });
			if (result.ok === false) {
				return result as unknown as TOutput;
			}
			revalidate({ input, course });
			return result;
		},
	);
}

export const createModuleAction = curriculumAction<
	{ courseId: string; title: string },
	{ moduleId: string }
>(
	z.object({ courseId: z.string().uuid(), title: z.string().min(1).max(200) }),
	async ({ input, session }) => {
		const r = await svc.createModule(
			input.courseId,
			input.title,
			session.user.id,
		);
		return r.ok ? { moduleId: r.moduleId } : { ok: false, error: r.error };
	},
	({ input, course }) =>
		revalidateCourseAdminPaths(input.courseId, course.slug),
);

export const createLessonAction = curriculumAction<
	{ courseId: string; moduleId: string; title: string },
	{ lessonId: string }
>(
	z.object({
		courseId: z.string().uuid(),
		moduleId: z.string().uuid(),
		title: z.string().min(1).max(200),
	}),
	async ({ input, session }) => {
		const r = await svc.createLesson(
			input.courseId,
			input.moduleId,
			input.title,
			session.user.id,
		);
		return r.ok ? { lessonId: r.lessonId } : { ok: false, error: r.error };
	},
	({ input }) => revalidatePath(`/admin/courses/${input.courseId}/curriculum`),
);

export const updateLessonAction = curriculumAction(
	z.object({
		courseId: z.string().uuid(),
		lessonId: z.string().uuid(),
		title: z.string().min(1).max(200).optional(),
		bodyMd: z.string().optional(),
		isPreview: z.boolean().optional(),
		isFree: z.boolean().optional(),
	}),
	async ({ input }) => {
		const { lessonId, ...patch } = input;
		const r = await svc.updateLesson(input.courseId, lessonId, patch);
		return r.ok ? {} : { ok: false, error: r.error };
	},
	({ input }) => {
		revalidatePath(`/admin/courses/${input.courseId}/curriculum`);
		revalidatePath(
			`/admin/courses/${input.courseId}/lessons/${input.lessonId}`,
		);
	},
);

export const reorderModulesAction = curriculumAction(
	z.object({
		courseId: z.string().uuid(),
		moduleIds: z.array(z.string().uuid()),
	}),
	async ({ input }) => {
		const r = await svc.reorderModules(input.courseId, input.moduleIds);
		return r.ok ? {} : { ok: false, error: r.error };
	},
	({ input }) => revalidatePath(`/admin/courses/${input.courseId}/curriculum`),
);

export const reorderLessonsAction = curriculumAction(
	z.object({
		courseId: z.string().uuid(),
		moduleId: z.string().uuid(),
		lessonIds: z.array(z.string().uuid()),
	}),
	async ({ input }) => {
		const r = await svc.reorderLessons(input.moduleId, input.lessonIds);
		return r.ok ? {} : { ok: false, error: r.error };
	},
	({ input }) => revalidatePath(`/admin/courses/${input.courseId}/curriculum`),
);

export const updateModuleAction = curriculumAction(
	z.object({
		courseId: z.string().uuid(),
		moduleId: z.string().uuid(),
		title: z.string().min(1).max(200),
	}),
	async ({ input }) => {
		const r = await svc.updateModule(input.courseId, input.moduleId, {
			title: input.title,
		});
		return r.ok ? {} : { ok: false, error: r.error };
	},
	({ input }) => revalidatePath(`/admin/courses/${input.courseId}/curriculum`),
);

export const deleteModuleAction = curriculumAction(
	z.object({ courseId: z.string().uuid(), moduleId: z.string().uuid() }),
	async ({ input }) => {
		const r = await svc.deleteModule(input.courseId, input.moduleId);
		return r.ok ? {} : { ok: false, error: r.error };
	},
	({ input, course }) =>
		revalidateCourseAdminPaths(input.courseId, course.slug),
);

export const renameLessonAction = curriculumAction(
	z.object({
		courseId: z.string().uuid(),
		lessonId: z.string().uuid(),
		title: z.string().min(1).max(200),
	}),
	async ({ input }) => {
		const r = await svc.updateLesson(input.courseId, input.lessonId, {
			title: input.title,
		});
		return r.ok ? {} : { ok: false, error: r.error };
	},
	({ input }) => {
		revalidatePath(`/admin/courses/${input.courseId}/curriculum`);
		revalidatePath(
			`/admin/courses/${input.courseId}/lessons/${input.lessonId}`,
		);
	},
);

export const deleteLessonAction = curriculumAction(
	z.object({ courseId: z.string().uuid(), lessonId: z.string().uuid() }),
	async ({ input }) => {
		const r = await svc.deleteLesson(input.courseId, input.lessonId);
		return r.ok ? {} : { ok: false, error: r.error };
	},
	({ input, course }) =>
		revalidateCourseAdminPaths(input.courseId, course.slug),
);
