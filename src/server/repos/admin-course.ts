import "server-only";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { course, courseModule, lesson } from "@/db/schema/course";
import { mediaAsset } from "@/db/schema/media";

export interface AdminCourseListItem {
  id: string;
  slug: string;
  title: string;
  status: string;
  isFree: boolean;
  price: string;
  publishedAt: Date | null;
  createdAt: Date;
}

export async function listAdminCourses(): Promise<AdminCourseListItem[]> {
  return db
    .select({
      id: course.id,
      slug: course.slug,
      title: course.title,
      status: course.status,
      isFree: course.isFree,
      price: course.price,
      publishedAt: course.publishedAt,
      createdAt: course.createdAt,
    })
    .from(course)
    .where(isNull(course.deletedAt))
    .orderBy(desc(course.createdAt));
}

export async function getAdminCourseById(courseId: string) {
  const rows = await db
    .select()
    .from(course)
    .where(and(eq(course.id, courseId), isNull(course.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createAdminCourse(input: {
  slug: string;
  title: string;
  summary: string;
  price: string;
  isFree: boolean;
  ownerUserId: string;
}) {
  const [row] = await db
    .insert(course)
    .values({
      slug: input.slug,
      title: input.title,
      summary: input.summary,
      price: input.price,
      isFree: input.isFree,
      ownerUserId: input.ownerUserId,
      createdByUserId: input.ownerUserId,
      status: "draft",
    })
    .returning({ id: course.id });
  return row!.id;
}

export async function updateAdminCourse(
  courseId: string,
  input: {
    title?: string;
    summary?: string;
    price?: string;
    isFree?: boolean;
    status?: string;
    publishedAt?: Date;
  },
) {
  await db
    .update(course)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(course.id, courseId));
}

// ─── Admin Curriculum ───

export interface AdminCurriculumLesson {
  id: string;
  title: string;
  bodyMd: string | null;
  durationSeconds: number | null;
  isPreview: boolean;
  isFree: boolean;
  sortOrder: number;
  videoMediaId: string | null;
  bunnyVideoId: string | null;
}

export interface AdminCurriculumModule {
  id: string;
  title: string;
  sortOrder: number;
  lessons: AdminCurriculumLesson[];
}

export async function getAdminCourseCurriculum(
  courseId: string,
): Promise<AdminCurriculumModule[]> {
  const modules = await db
    .select({
      id: courseModule.id,
      title: courseModule.title,
      sortOrder: courseModule.sortOrder,
    })
    .from(courseModule)
    .where(and(eq(courseModule.courseId, courseId), isNull(courseModule.deletedAt)))
    .orderBy(asc(courseModule.sortOrder));

  if (modules.length === 0) return [];

  const lessonsRows = await db
    .select({
      id: lesson.id,
      moduleId: lesson.moduleId,
      title: lesson.title,
      bodyMd: lesson.bodyMd,
      durationSeconds: lesson.durationSeconds,
      isPreview: lesson.isPreview,
      isFree: lesson.isFree,
      sortOrder: lesson.sortOrder,
      videoMediaId: lesson.videoMediaId,
      bunnyVideoId:
        sql<string | null>`case when ${mediaAsset.storage} = 'bunny_stream' then ${mediaAsset.storageKey} end`.as(
          "bunny_video_id",
        ),
    })
    .from(lesson)
    .leftJoin(mediaAsset, eq(lesson.videoMediaId, mediaAsset.id))
    .where(isNull(lesson.deletedAt))
    .orderBy(asc(lesson.sortOrder));

  const byModule = new Map<string, AdminCurriculumLesson[]>();
  for (const l of lessonsRows) {
    const list = byModule.get(l.moduleId) ?? [];
    list.push({
      id: l.id,
      title: l.title,
      bodyMd: l.bodyMd,
      durationSeconds: l.durationSeconds,
      isPreview: l.isPreview,
      isFree: l.isFree,
      sortOrder: l.sortOrder,
      videoMediaId: l.videoMediaId,
      bunnyVideoId: l.bunnyVideoId,
    });
    byModule.set(l.moduleId, list);
  }

  return modules.map((m) => ({
    id: m.id,
    title: m.title,
    sortOrder: m.sortOrder,
    lessons: byModule.get(m.id) ?? [],
  }));
}

export async function getAdminLessonById(lessonId: string) {
  const rows = await db
    .select({
      id: lesson.id,
      moduleId: lesson.moduleId,
      title: lesson.title,
      bodyMd: lesson.bodyMd,
      durationSeconds: lesson.durationSeconds,
      isPreview: lesson.isPreview,
      isFree: lesson.isFree,
      sortOrder: lesson.sortOrder,
      videoMediaId: lesson.videoMediaId,
      bunnyVideoId:
        sql<string | null>`case when ${mediaAsset.storage} = 'bunny_stream' then ${mediaAsset.storageKey} end`.as(
          "bunny_video_id",
        ),
    })
    .from(lesson)
    .leftJoin(mediaAsset, eq(lesson.videoMediaId, mediaAsset.id))
    .where(and(eq(lesson.id, lessonId), isNull(lesson.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
}

export async function createAdminModule(input: {
  courseId: string;
  title: string;
  sortOrder: number;
  createdByUserId: string;
}) {
  const [row] = await db
    .insert(courseModule)
    .values({
      courseId: input.courseId,
      title: input.title,
      sortOrder: input.sortOrder,
      createdByUserId: input.createdByUserId,
    })
    .returning({ id: courseModule.id });
  return row!.id;
}

export async function createAdminLesson(input: {
  moduleId: string;
  title: string;
  sortOrder: number;
  createdByUserId: string;
}) {
  const [row] = await db
    .insert(lesson)
    .values({
      moduleId: input.moduleId,
      title: input.title,
      sortOrder: input.sortOrder,
      createdByUserId: input.createdByUserId,
    })
    .returning({ id: lesson.id });
  return row!.id;
}

export async function updateAdminLesson(
  lessonId: string,
  input: {
    title?: string;
    bodyMd?: string | null;
    isPreview?: boolean;
    isFree?: boolean;
    durationSeconds?: number | null;
    videoMediaId?: string | null;
  },
) {
  await db
    .update(lesson)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(lesson.id, lessonId));
}


export async function reorderAdminModules(
  courseId: string,
  moduleIds: string[],
) {
  for (let i = 0; i < moduleIds.length; i++) {
    await db
      .update(courseModule)
      .set({ sortOrder: i, updatedAt: new Date() })
      .where(eq(courseModule.id, moduleIds[i]!));
  }
}

export async function reorderAdminLessons(
  moduleId: string,
  lessonIds: string[],
) {
  for (let i = 0; i < lessonIds.length; i++) {
    await db
      .update(lesson)
      .set({ sortOrder: i, updatedAt: new Date() })
      .where(eq(lesson.id, lessonIds[i]!));
  }
}
