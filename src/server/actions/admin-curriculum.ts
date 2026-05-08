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
import { createCurriculumAdminService } from "@/server/services/curriculum-admin";
import {
	adminCourseAction,
	formDataParser,
	jsonParser,
	revalidateCourseAdminPaths,
} from "@/server/admin/admin-command";

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

export const createModuleAction = adminCourseAction(
	jsonParser(
		z.object({
			courseId: z.string().uuid(),
			title: z.string().min(1).max(200),
		}),
	),
	(input) => input.courseId,
	async ({ input, course, session }) => {
		const result = await svc.createModule(input.courseId, input.title, session.user.id);
		if (!result.ok) return result as { ok: false; error: string };
		revalidateCourseAdminPaths(input.courseId, course.slug);
		return { moduleId: result.moduleId };
	},
);

export const createLessonAction = adminCourseAction(
	jsonParser(
		z.object({
			courseId: z.string().uuid(),
			moduleId: z.string().uuid(),
			title: z.string().min(1).max(200),
		}),
	),
	(input) => input.courseId,
	async ({ input, session }) => {
		const result = await svc.createLesson(
			input.courseId,
			input.moduleId,
			input.title,
			session.user.id,
		);
		if (!result.ok) return result as { ok: false; error: string };
		revalidatePath(`/admin/courses/${input.courseId}/curriculum`);
		return { lessonId: result.lessonId };
	},
);

export const updateLessonAction = adminCourseAction(
	jsonParser(
		z.object({
			courseId: z.string().uuid(),
			lessonId: z.string().uuid(),
			title: z.string().min(1).max(200).optional(),
			bodyMd: z.string().optional(),
			isPreview: z.boolean().optional(),
			isFree: z.boolean().optional(),
		}),
	),
	(input) => input.courseId,
	async ({ input }) => {
		const { lessonId, ...patch } = input;
		const result = await svc.updateLesson(input.courseId, lessonId, patch);
		if (!result.ok) return result as { ok: false; error: string };
		revalidatePath(`/admin/courses/${input.courseId}/curriculum`);
		revalidatePath(`/admin/courses/${input.courseId}/lessons/${lessonId}`);
		return {};
	},
);

export const reorderModulesAction = adminCourseAction(
	jsonParser(
		z.object({
			courseId: z.string().uuid(),
			moduleIds: z.array(z.string().uuid()),
		}),
	),
	(input) => input.courseId,
	async ({ input }) => {
		const result = await svc.reorderModules(input.courseId, input.moduleIds);
		if (!result.ok) return result as { ok: false; error: string };
		revalidatePath(`/admin/courses/${input.courseId}/curriculum`);
		return {};
	},
);

export const reorderLessonsAction = adminCourseAction(
	jsonParser(
		z.object({
			courseId: z.string().uuid(),
			moduleId: z.string().uuid(),
			lessonIds: z.array(z.string().uuid()),
		}),
	),
	(input) => input.courseId,
	async ({ input }) => {
		const result = await svc.reorderLessons(input.moduleId, input.lessonIds);
		if (!result.ok) return result as { ok: false; error: string };
		revalidatePath(`/admin/courses/${input.courseId}/curriculum`);
		return {};
	},
);

export const updateModuleAction = adminCourseAction(
	jsonParser(
		z.object({
			courseId: z.string().uuid(),
			moduleId: z.string().uuid(),
			title: z.string().min(1).max(200),
		}),
	),
	(input) => input.courseId,
	async ({ input }) => {
		const result = await svc.updateModule(input.courseId, input.moduleId, {
			title: input.title,
		});
		if (!result.ok) return result as { ok: false; error: string };
		revalidatePath(`/admin/courses/${input.courseId}/curriculum`);
		return {};
	},
);

export const deleteModuleAction = adminCourseAction(
	jsonParser(
		z.object({
			courseId: z.string().uuid(),
			moduleId: z.string().uuid(),
		}),
	),
	(input) => input.courseId,
	async ({ input, course }) => {
		const result = await svc.deleteModule(input.courseId, input.moduleId);
		if (!result.ok) return result as { ok: false; error: string };
		revalidateCourseAdminPaths(input.courseId, course.slug);
		return {};
	},
);

export const renameLessonAction = adminCourseAction(
	jsonParser(
		z.object({
			courseId: z.string().uuid(),
			lessonId: z.string().uuid(),
			title: z.string().min(1).max(200),
		}),
	),
	(input) => input.courseId,
	async ({ input }) => {
		const result = await svc.updateLesson(input.courseId, input.lessonId, {
			title: input.title,
		});
		if (!result.ok) return result as { ok: false; error: string };
		revalidatePath(`/admin/courses/${input.courseId}/curriculum`);
		revalidatePath(
			`/admin/courses/${input.courseId}/lessons/${input.lessonId}`,
		);
		return {};
	},
);

export const deleteLessonAction = adminCourseAction(
	jsonParser(
		z.object({
			courseId: z.string().uuid(),
			lessonId: z.string().uuid(),
		}),
	),
	(input) => input.courseId,
	async ({ input, course }) => {
		const result = await svc.deleteLesson(input.courseId, input.lessonId);
		if (!result.ok) return result as { ok: false; error: string };
		revalidateCourseAdminPaths(input.courseId, course.slug);
		return {};
	},
);
