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
  reorderAdminModules,
  reorderAdminLessons,
} from "@/server/repos/admin-course";
import { getCourseCurriculum } from "@/server/repos/course";
import { createCurriculumAdminService } from "@/server/services/curriculum-admin";
import {
  requireAdminSession,
  requireCourseAccess,
  revalidateCourseAdminPaths,
} from "@/server/admin/admin-command";

const svc = createCurriculumAdminService({
  getCourseCurriculum,
  createAdminModule,
  createAdminLesson,
  updateAdminModule,
  updateAdminLesson,
  deleteAdminModule,
  deleteAdminLesson,
  reorderAdminModules,
  reorderAdminLessons,
});

const createModuleSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(1).max(200),
});

export async function createModuleAction(formData: FormData) {
  const auth = await requireAdminSession();
  if (!auth.ok) return { ok: false, error: auth.error } as const;

  const parsed = createModuleSchema.safeParse({
    courseId: formData.get("courseId"),
    title: formData.get("title"),
  });
  if (!parsed.success) return { ok: false, error: "invalid_input" as const };

  const access = await requireCourseAccess(auth.session, parsed.data.courseId);
  if (!access.ok) return { ok: false, error: access.error } as const;

  const result = await svc.createModule(
    parsed.data.courseId,
    parsed.data.title,
    auth.session.user.id,
  );
  if (!result.ok) return { ok: false, error: result.error };

  revalidateCourseAdminPaths(parsed.data.courseId, access.course.slug);
  return { ok: true, moduleId: result.moduleId };
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
  if (!parsed.success) return { ok: false, error: "invalid_input" as const };

  const courseId = formData.get("courseId") as string;
  const access = await requireCourseAccess(auth.session, courseId);
  if (!access.ok) return { ok: false, error: access.error } as const;

  const result = await svc.createLesson(
    courseId,
    parsed.data.moduleId,
    parsed.data.title,
    auth.session.user.id,
  );
  if (!result.ok) return { ok: false, error: result.error };

  revalidatePath(`/admin/courses/${courseId}/curriculum`);
  return { ok: true, lessonId: result.lessonId };
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

  const courseId = formData.get("courseId") as string;
  const access = await requireCourseAccess(auth.session, courseId);
  if (!access.ok) return { ok: false, error: access.error } as const;

  const raw: Record<string, unknown> = { lessonId: formData.get("lessonId") };
  for (const key of ["title", "bodyMd", "isPreview", "isFree"] as const) {
    const val = formData.get(key);
    if (val !== null) raw[key] = val;
  }

  const parsed = updateLessonSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid_input" as const };

  const { lessonId, ...patch } = parsed.data;
  const result = await svc.updateLesson(courseId, lessonId, patch);
  if (!result.ok) return { ok: false, error: result.error };

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

  let moduleIds: string[];
  try {
    moduleIds = JSON.parse(formData.get("moduleIds") as string);
  } catch {
    return { ok: false, error: "invalid_input" as const };
  }

  const parsed = reorderModulesSchema.safeParse({ courseId, moduleIds });
  if (!parsed.success) return { ok: false, error: "invalid_input" as const };

  const result = await svc.reorderModules(courseId, parsed.data.moduleIds);
  if (!result.ok) return { ok: false, error: result.error };

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

  let lessonIds: string[];
  try {
    lessonIds = JSON.parse(formData.get("lessonIds") as string);
  } catch {
    return { ok: false, error: "invalid_input" as const };
  }

  const parsed = reorderLessonsSchema.safeParse({ moduleId, lessonIds });
  if (!parsed.success) return { ok: false, error: "invalid_input" as const };

  const result = await svc.reorderLessons(moduleId, parsed.data.lessonIds);
  if (!result.ok) return { ok: false, error: result.error };

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

  const result = await svc.updateModule(
    parsed.data.courseId,
    parsed.data.moduleId,
    { title: parsed.data.title },
  );
  if (!result.ok) return { ok: false, error: result.error };

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

  const result = await svc.deleteModule(
    parsed.data.courseId,
    parsed.data.moduleId,
  );
  if (!result.ok) return { ok: false, error: result.error };

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

  const result = await svc.updateLesson(
    parsed.data.courseId,
    parsed.data.lessonId,
    { title: parsed.data.title },
  );
  if (!result.ok) return { ok: false, error: result.error };

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

  const result = await svc.deleteLesson(
    parsed.data.courseId,
    parsed.data.lessonId,
  );
  if (!result.ok) return { ok: false, error: result.error };

  revalidateCourseAdminPaths(parsed.data.courseId, access.course.slug);
  return { ok: true };
}
