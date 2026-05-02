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
	getAdminLessonById,
	reorderAdminModules,
	reorderAdminLessons,
} from "@/server/repos/admin-course";
import { getCourseCurriculum } from "@/server/repos/course";
import { CurriculumAdminService } from "@/server/services/curriculum-admin";
import {
	requireAdminSession,
	requireCourseAccess,
	revalidateCourseAdminPaths,
} from "@/server/admin/admin-command";

function makeCurriculumService() {
	return new CurriculumAdminService({ getCourseCurriculum });
}

const createModuleSchema = z.object({
	courseId: z.string().uuid(),
	title: z.string().min(1).max(200),
});

export async function createModuleAction(formData: FormData) {
	const auth = await requireAdminSession();
	if (!auth.ok) return { ok: false, error: auth.error } as const;

	const courseId = formData.get("courseId") as string;
	const access = await requireCourseAccess(auth.session, courseId);
	if (!access.ok) return { ok: false, error: access.error } as const;

	const parsed = createModuleSchema.safeParse({
		courseId,
		title: formData.get("title"),
	});
	if (!parsed.success) {
		return { ok: false, error: "invalid_input" as const };
	}

	const svc = makeCurriculumService();
	const nextSortOrder = await svc.computeNextModuleSortOrder(courseId);

	const moduleId = await createAdminModule({
		courseId: parsed.data.courseId,
		title: parsed.data.title,
		sortOrder: nextSortOrder,
		createdByUserId: auth.session.user.id,
	});

	revalidateCourseAdminPaths(courseId, access.course.slug);
	return { ok: true, moduleId };
}

const createLessonSchema = z.object({
	moduleId: z.string().uuid(),
	title: z.string().min(1).max(200),
});

export async function createLessonAction(formData: FormData) {
	const auth = await requireAdminSession();
	if (!auth.ok) return { ok: false, error: auth.error } as const;

	const moduleId = formData.get("moduleId") as string;
	const parsed = createLessonSchema.safeParse({
		moduleId,
		title: formData.get("title"),
	});
	if (!parsed.success) {
		return { ok: false, error: "invalid_input" as const };
	}

	const courseId = formData.get("courseId") as string;
	const access = await requireCourseAccess(auth.session, courseId);
	if (!access.ok) return { ok: false, error: access.error } as const;

	const svc = makeCurriculumService();
	const nextSortOrder = await svc.computeNextLessonSortOrder(
		courseId,
		moduleId,
	);
	if (nextSortOrder === null) {
		return { ok: false, error: "not_found" as const };
	}

	const lessonId = await createAdminLesson({
		moduleId: parsed.data.moduleId,
		title: parsed.data.title,
		sortOrder: nextSortOrder,
		createdByUserId: auth.session.user.id,
	});

	revalidatePath(`/admin/courses/${courseId}/curriculum`);
	return { ok: true, lessonId };
}

const updateLessonSchema = z.object({
	lessonId: z.string().uuid(),
	title: z.string().min(1).max(200).optional(),
	bodyMd: z.string().optional(),
	isPreview: z.coerce.boolean().optional(),
	isFree: z.coerce.boolean().optional(),
});

export async function updateLessonAction(formData: FormData) {
	const auth = await requireAdminSession();
	if (!auth.ok) return { ok: false, error: auth.error } as const;

	const lessonId = formData.get("lessonId") as string;
	const lessonRow = await getAdminLessonById(lessonId);
	if (!lessonRow) {
		return { ok: false, error: "not_found" as const };
	}

	const courseId = formData.get("courseId") as string;
	const access = await requireCourseAccess(auth.session, courseId);
	if (!access.ok) return { ok: false, error: access.error } as const;

	const svc = makeCurriculumService();
	const verified = await svc.verifyLessonInCourse(lessonId, courseId);
	if (!verified.ok) return { ok: false, error: verified.error };

	const raw: Record<string, unknown> = { lessonId };
	for (const key of ["title", "bodyMd", "isPreview", "isFree"] as const) {
		const val = formData.get(key);
		if (val !== null) raw[key] = val;
	}

	const parsed = updateLessonSchema.safeParse(raw);
	if (!parsed.success) {
		return { ok: false, error: "invalid_input" as const };
	}

	const { lessonId: _, ...updates } = parsed.data;
	await updateAdminLesson(lessonId, {
		...updates,
		bodyMd: updates.bodyMd ?? null,
	});

	revalidatePath(`/admin/courses/${courseId}/curriculum`);
	revalidatePath(`/admin/courses/${courseId}/lessons/${lessonId}`);

	return { ok: true };
}

const reorderModulesSchema = z.object({
	courseId: z.string().uuid(),
	moduleIds: z.array(z.string().uuid()),
});

export async function reorderModulesAction(formData: FormData) {
	const auth = await requireAdminSession();
	if (!auth.ok) return { ok: false, error: auth.error } as const;

	const courseId = formData.get("courseId") as string;
	const access = await requireCourseAccess(auth.session, courseId);
	if (!access.ok) return { ok: false, error: access.error } as const;

	const moduleIdsRaw = formData.get("moduleIds") as string;
	let moduleIds: string[];
	try {
		moduleIds = JSON.parse(moduleIdsRaw);
	} catch {
		return { ok: false, error: "invalid_input" as const };
	}

	const parsed = reorderModulesSchema.safeParse({ courseId, moduleIds });
	if (!parsed.success) {
		return { ok: false, error: "invalid_input" as const };
	}

	await reorderAdminModules(courseId, parsed.data.moduleIds);
	revalidatePath(`/admin/courses/${courseId}/curriculum`);
	return { ok: true };
}

const reorderLessonsSchema = z.object({
	moduleId: z.string().uuid(),
	lessonIds: z.array(z.string().uuid()),
});

export async function reorderLessonsAction(formData: FormData) {
	const auth = await requireAdminSession();
	if (!auth.ok) return { ok: false, error: auth.error } as const;

	const moduleId = formData.get("moduleId") as string;
	const courseId = formData.get("courseId") as string;

	const access = await requireCourseAccess(auth.session, courseId);
	if (!access.ok) return { ok: false, error: access.error } as const;

	const lessonIdsRaw = formData.get("lessonIds") as string;
	let lessonIds: string[];
	try {
		lessonIds = JSON.parse(lessonIdsRaw);
	} catch {
		return { ok: false, error: "invalid_input" as const };
	}

	const parsed = reorderLessonsSchema.safeParse({ moduleId, lessonIds });
	if (!parsed.success) {
		return { ok: false, error: "invalid_input" as const };
	}

	await reorderAdminLessons(moduleId, parsed.data.lessonIds);
	revalidatePath(`/admin/courses/${courseId}/curriculum`);
	return { ok: true };
}

const updateModuleSchema = z.object({
	courseId: z.string().uuid(),
	moduleId: z.string().uuid(),
	title: z.string().min(1).max(200),
});

export async function updateModuleAction(
	input: z.infer<typeof updateModuleSchema>,
) {
	const auth = await requireAdminSession();
	if (!auth.ok) return { ok: false, error: auth.error } as const;

	const parsed = updateModuleSchema.safeParse(input);
	if (!parsed.success) return { ok: false, error: "invalid_input" as const };

	const access = await requireCourseAccess(auth.session, parsed.data.courseId);
	if (!access.ok) return { ok: false, error: access.error } as const;

	const svc = makeCurriculumService();
	const verified = await svc.verifyModuleInCourse(
		parsed.data.moduleId,
		parsed.data.courseId,
	);
	if (!verified.ok) return { ok: false, error: verified.error };

	await updateAdminModule(parsed.data.moduleId, { title: parsed.data.title });
	revalidatePath(`/admin/courses/${parsed.data.courseId}/curriculum`);
	return { ok: true };
}

const deleteModuleSchema = z.object({
	courseId: z.string().uuid(),
	moduleId: z.string().uuid(),
});

export async function deleteModuleAction(
	input: z.infer<typeof deleteModuleSchema>,
) {
	const auth = await requireAdminSession();
	if (!auth.ok) return { ok: false, error: auth.error } as const;

	const parsed = deleteModuleSchema.safeParse(input);
	if (!parsed.success) return { ok: false, error: "invalid_input" as const };

	const access = await requireCourseAccess(auth.session, parsed.data.courseId);
	if (!access.ok) return { ok: false, error: access.error } as const;

	const svc = makeCurriculumService();
	const verified = await svc.verifyModuleInCourse(
		parsed.data.moduleId,
		parsed.data.courseId,
	);
	if (!verified.ok) return { ok: false, error: verified.error };

	await deleteAdminModule(parsed.data.moduleId);
	revalidateCourseAdminPaths(parsed.data.courseId, access.course.slug);
	return { ok: true };
}

const renameLessonSchema = z.object({
	courseId: z.string().uuid(),
	lessonId: z.string().uuid(),
	title: z.string().min(1).max(200),
});

export async function renameLessonAction(
	input: z.infer<typeof renameLessonSchema>,
) {
	const auth = await requireAdminSession();
	if (!auth.ok) return { ok: false, error: auth.error } as const;

	const parsed = renameLessonSchema.safeParse(input);
	if (!parsed.success) return { ok: false, error: "invalid_input" as const };

	const access = await requireCourseAccess(auth.session, parsed.data.courseId);
	if (!access.ok) return { ok: false, error: access.error } as const;

	const lessonRow = await getAdminLessonById(parsed.data.lessonId);
	if (!lessonRow) return { ok: false, error: "not_found" as const };

	const svc = makeCurriculumService();
	const verified = await svc.verifyLessonInCourse(
		parsed.data.lessonId,
		parsed.data.courseId,
	);
	if (!verified.ok) return { ok: false, error: verified.error };

	await updateAdminLesson(parsed.data.lessonId, { title: parsed.data.title });
	revalidatePath(`/admin/courses/${parsed.data.courseId}/curriculum`);
	revalidatePath(
		`/admin/courses/${parsed.data.courseId}/lessons/${parsed.data.lessonId}`,
	);
	return { ok: true };
}

const deleteLessonSchema = z.object({
	courseId: z.string().uuid(),
	lessonId: z.string().uuid(),
});

export async function deleteLessonAction(
	input: z.infer<typeof deleteLessonSchema>,
) {
	const auth = await requireAdminSession();
	if (!auth.ok) return { ok: false, error: auth.error } as const;

	const parsed = deleteLessonSchema.safeParse(input);
	if (!parsed.success) return { ok: false, error: "invalid_input" as const };

	const access = await requireCourseAccess(auth.session, parsed.data.courseId);
	if (!access.ok) return { ok: false, error: access.error } as const;

	const lessonRow = await getAdminLessonById(parsed.data.lessonId);
	if (!lessonRow) return { ok: false, error: "not_found" as const };

	const svc = makeCurriculumService();
	const verified = await svc.verifyLessonInCourse(
		parsed.data.lessonId,
		parsed.data.courseId,
	);
	if (!verified.ok) return { ok: false, error: verified.error };

	await deleteAdminLesson(parsed.data.lessonId);
	revalidateCourseAdminPaths(parsed.data.courseId, access.course.slug);
	return { ok: true };
}
