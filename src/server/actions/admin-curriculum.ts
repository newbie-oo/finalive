"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSession } from "@/server/auth-session";
import { canEditCourse } from "@/server/services/course-authz";
import {
  createAdminModule,
  createAdminLesson,
  updateAdminLesson,
  updateAdminModule,
  deleteAdminModule,
  deleteAdminLesson,
  getAdminCourseById,
  getAdminLessonById,
  reorderAdminModules,
  reorderAdminLessons,
} from "@/server/repos/admin-course";
import { getCourseCurriculum } from "@/server/repos/course";

const createModuleSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(1).max(200),
});

export async function createModuleAction(formData: FormData) {
  const session = await getSession();
  if (!session?.user?.id) {
    return { ok: false, error: "unauthorized" as const };
  }

  const courseId = formData.get("courseId") as string;
  const courseRow = await getAdminCourseById(courseId);
  if (!courseRow) {
    return { ok: false, error: "not_found" as const };
  }

  const canEdit = await canEditCourse(session.user.id, session.user.role, courseId);
  if (!canEdit) {
    return { ok: false, error: "forbidden" as const };
  }

  const parsed = createModuleSchema.safeParse({
    courseId,
    title: formData.get("title"),
  });
  if (!parsed.success) {
    return { ok: false, error: "invalid_input" as const };
  }

  const curriculum = await getCourseCurriculum(courseId);
  const nextSortOrder = curriculum.length > 0 ? Math.max(...curriculum.map((m) => m.sortOrder)) + 1 : 0;

  const moduleId = await createAdminModule({
    courseId: parsed.data.courseId,
    title: parsed.data.title,
    sortOrder: nextSortOrder,
    createdByUserId: session.user.id,
  });

  revalidatePath(`/admin/courses/${courseId}/curriculum`);
  revalidatePath(`/courses/${courseRow.slug}`);

  return { ok: true, moduleId };
}

const createLessonSchema = z.object({
  moduleId: z.string().uuid(),
  title: z.string().min(1).max(200),
});

export async function createLessonAction(formData: FormData) {
  const session = await getSession();
  if (!session?.user?.id) {
    return { ok: false, error: "unauthorized" as const };
  }

  const moduleId = formData.get("moduleId") as string;
  const parsed = createLessonSchema.safeParse({
    moduleId,
    title: formData.get("title"),
  });
  if (!parsed.success) {
    return { ok: false, error: "invalid_input" as const };
  }

  // Find course from module to check authz.
  const curriculum = await getCourseCurriculum(formData.get("courseId") as string);
  const targetModule = curriculum.find((m) => m.id === moduleId);
  if (!targetModule) {
    return { ok: false, error: "not_found" as const };
  }

  const courseId = formData.get("courseId") as string;
  const canEdit = await canEditCourse(session.user.id, session.user.role, courseId);
  if (!canEdit) {
    return { ok: false, error: "forbidden" as const };
  }

  const nextSortOrder =
    targetModule.lessons.length > 0
      ? Math.max(...targetModule.lessons.map((l) => l.sortOrder)) + 1
      : 0;

  const lessonId = await createAdminLesson({
    moduleId: parsed.data.moduleId,
    title: parsed.data.title,
    sortOrder: nextSortOrder,
    createdByUserId: session.user.id,
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
  const session = await getSession();
  if (!session?.user?.id) {
    return { ok: false, error: "unauthorized" as const };
  }

  const lessonId = formData.get("lessonId") as string;
  const lessonRow = await getAdminLessonById(lessonId);
  if (!lessonRow) {
    return { ok: false, error: "not_found" as const };
  }

  // Need courseId for authz; look it up via curriculum.
  const curriculum = await getCourseCurriculum(formData.get("courseId") as string);
  const moduleIds = curriculum.map((m) => m.id);
  if (!moduleIds.includes(lessonRow.moduleId)) {
    return { ok: false, error: "forbidden" as const };
  }

  const courseId = formData.get("courseId") as string;
  const canEdit = await canEditCourse(session.user.id, session.user.role, courseId);
  if (!canEdit) {
    return { ok: false, error: "forbidden" as const };
  }

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
  const session = await getSession();
  if (!session?.user?.id) {
    return { ok: false, error: "unauthorized" as const };
  }

  const courseId = formData.get("courseId") as string;
  const courseRow = await getAdminCourseById(courseId);
  if (!courseRow) {
    return { ok: false, error: "not_found" as const };
  }

  const canEdit = await canEditCourse(session.user.id, session.user.role, courseId);
  if (!canEdit) {
    return { ok: false, error: "forbidden" as const };
  }

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
  const session = await getSession();
  if (!session?.user?.id) {
    return { ok: false, error: "unauthorized" as const };
  }

  const moduleId = formData.get("moduleId") as string;
  const courseId = formData.get("courseId") as string;

  const courseRow = await getAdminCourseById(courseId);
  if (!courseRow) {
    return { ok: false, error: "not_found" as const };
  }

  const canEdit = await canEditCourse(session.user.id, session.user.role, courseId);
  if (!canEdit) {
    return { ok: false, error: "forbidden" as const };
  }

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

export async function updateModuleAction(input: z.infer<typeof updateModuleSchema>) {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "unauthorized" as const };
  const parsed = updateModuleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" as const };

  const courseRow = await getAdminCourseById(parsed.data.courseId);
  if (!courseRow) return { ok: false, error: "not_found" as const };
  if (!(await canEditCourse(session.user.id, session.user.role, parsed.data.courseId))) {
    return { ok: false, error: "forbidden" as const };
  }

  // Ensure the module belongs to this course before mutating it.
  const curriculum = await getCourseCurriculum(parsed.data.courseId);
  if (!curriculum.some((m) => m.id === parsed.data.moduleId)) {
    return { ok: false, error: "not_found" as const };
  }

  await updateAdminModule(parsed.data.moduleId, { title: parsed.data.title });
  revalidatePath(`/admin/courses/${parsed.data.courseId}/curriculum`);
  return { ok: true };
}

const deleteModuleSchema = z.object({
  courseId: z.string().uuid(),
  moduleId: z.string().uuid(),
});

export async function deleteModuleAction(input: z.infer<typeof deleteModuleSchema>) {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "unauthorized" as const };
  const parsed = deleteModuleSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" as const };

  const courseRow = await getAdminCourseById(parsed.data.courseId);
  if (!courseRow) return { ok: false, error: "not_found" as const };
  if (!(await canEditCourse(session.user.id, session.user.role, parsed.data.courseId))) {
    return { ok: false, error: "forbidden" as const };
  }

  const curriculum = await getCourseCurriculum(parsed.data.courseId);
  if (!curriculum.some((m) => m.id === parsed.data.moduleId)) {
    return { ok: false, error: "not_found" as const };
  }

  await deleteAdminModule(parsed.data.moduleId);
  revalidatePath(`/admin/courses/${parsed.data.courseId}/curriculum`);
  revalidatePath(`/courses/${courseRow.slug}`);
  return { ok: true };
}

const renameLessonSchema = z.object({
  courseId: z.string().uuid(),
  lessonId: z.string().uuid(),
  title: z.string().min(1).max(200),
});

export async function renameLessonAction(input: z.infer<typeof renameLessonSchema>) {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "unauthorized" as const };
  const parsed = renameLessonSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" as const };

  const courseRow = await getAdminCourseById(parsed.data.courseId);
  if (!courseRow) return { ok: false, error: "not_found" as const };
  if (!(await canEditCourse(session.user.id, session.user.role, parsed.data.courseId))) {
    return { ok: false, error: "forbidden" as const };
  }

  const lessonRow = await getAdminLessonById(parsed.data.lessonId);
  if (!lessonRow) return { ok: false, error: "not_found" as const };

  // Authorise via curriculum scope to confirm the lesson belongs to this course.
  const curriculum = await getCourseCurriculum(parsed.data.courseId);
  if (!curriculum.some((m) => m.id === lessonRow.moduleId)) {
    return { ok: false, error: "not_found" as const };
  }

  await updateAdminLesson(parsed.data.lessonId, { title: parsed.data.title });
  revalidatePath(`/admin/courses/${parsed.data.courseId}/curriculum`);
  revalidatePath(`/admin/courses/${parsed.data.courseId}/lessons/${parsed.data.lessonId}`);
  return { ok: true };
}

const deleteLessonSchema = z.object({
  courseId: z.string().uuid(),
  lessonId: z.string().uuid(),
});

export async function deleteLessonAction(input: z.infer<typeof deleteLessonSchema>) {
  const session = await getSession();
  if (!session?.user?.id) return { ok: false, error: "unauthorized" as const };
  const parsed = deleteLessonSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" as const };

  const courseRow = await getAdminCourseById(parsed.data.courseId);
  if (!courseRow) return { ok: false, error: "not_found" as const };
  if (!(await canEditCourse(session.user.id, session.user.role, parsed.data.courseId))) {
    return { ok: false, error: "forbidden" as const };
  }

  const lessonRow = await getAdminLessonById(parsed.data.lessonId);
  if (!lessonRow) return { ok: false, error: "not_found" as const };

  const curriculum = await getCourseCurriculum(parsed.data.courseId);
  if (!curriculum.some((m) => m.id === lessonRow.moduleId)) {
    return { ok: false, error: "not_found" as const };
  }

  await deleteAdminLesson(parsed.data.lessonId);
  revalidatePath(`/admin/courses/${parsed.data.courseId}/curriculum`);
  revalidatePath(`/courses/${courseRow.slug}`);
  return { ok: true };
}
