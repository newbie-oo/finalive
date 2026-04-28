import "server-only";
import { and, asc, count, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { course, courseModule, lesson } from "@/db/schema/course";
import { mediaAsset } from "@/db/schema/media";
import { publicUrl } from "@/server/services/r2";
import {
  buildOffsetResponse,
  type OffsetParams,
  type OffsetResponse,
} from "@/lib/pagination";

export interface PublicCourseSummary {
  id: string;
  slug: string;
  title: string;
  summary: string;
  price: string;
  isFree: boolean;
  publishedAt: Date | null;
  coverUrl: string | null;
}

export async function listPublishedCourses(
  params: OffsetParams,
): Promise<OffsetResponse<PublicCourseSummary>> {
  const where = and(eq(course.status, "published"), isNull(course.deletedAt));

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: course.id,
        slug: course.slug,
        title: course.title,
        summary: course.summary,
        price: course.price,
        isFree: course.isFree,
        publishedAt: course.publishedAt,
        coverMediaId: course.coverMediaId,
        coverStorageKey: mediaAsset.storageKey,
      })
      .from(course)
      .leftJoin(mediaAsset, eq(course.coverMediaId, mediaAsset.id))
      .where(where)
      .orderBy(desc(course.publishedAt))
      .limit(params.per_page)
      .offset((params.page - 1) * params.per_page),
    db.select({ value: count() }).from(course).where(where),
  ]);

  const mappedRows = rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    summary: r.summary,
    price: r.price,
    isFree: r.isFree,
    publishedAt: r.publishedAt,
    coverUrl: r.coverStorageKey ? publicUrl(`covers/${r.coverStorageKey}-640.webp`) : null,
  }));

  const total = totalRows[0]?.value ?? 0;
  return buildOffsetResponse(mappedRows, total, params);
}

export interface PendingCheckoutInfo {
  pendingId: string;
  refCode: string;
  amount: string;
  expiresAt: Date;
  status: string;
  courseSlug: string;
  courseTitle: string;
}

export async function listFeaturedCourses(limit = 3): Promise<PublicCourseSummary[]> {
  const where = and(eq(course.status, "published"), isNull(course.deletedAt));
  const rows = await db
    .select({
      id: course.id,
      slug: course.slug,
      title: course.title,
      summary: course.summary,
      price: course.price,
      isFree: course.isFree,
      publishedAt: course.publishedAt,
      coverStorageKey: mediaAsset.storageKey,
    })
    .from(course)
    .leftJoin(mediaAsset, eq(course.coverMediaId, mediaAsset.id))
    .where(where)
    .orderBy(desc(course.publishedAt))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    summary: r.summary,
    price: r.price,
    isFree: r.isFree,
    publishedAt: r.publishedAt,
    coverUrl: r.coverStorageKey ? publicUrl(`covers/${r.coverStorageKey}-640.webp`) : null,
  }));
}

export async function getPublishedCourseBySlug(
  slug: string,
): Promise<PublicCourseSummary | null> {
  const rows = await db
    .select({
      id: course.id,
      slug: course.slug,
      title: course.title,
      summary: course.summary,
      price: course.price,
      isFree: course.isFree,
      publishedAt: course.publishedAt,
      coverStorageKey: mediaAsset.storageKey,
    })
    .from(course)
    .leftJoin(mediaAsset, eq(course.coverMediaId, mediaAsset.id))
    .where(
      and(eq(course.slug, slug), eq(course.status, "published"), isNull(course.deletedAt)),
    )
    .limit(1);

  const r = rows[0];
  if (!r) return null;
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    summary: r.summary,
    price: r.price,
    isFree: r.isFree,
    publishedAt: r.publishedAt,
    coverUrl: r.coverStorageKey ? publicUrl(`covers/${r.coverStorageKey}-640.webp`) : null,
  };
}

export interface PreviewLesson {
  id: string;
  courseSlug: string;
  courseTitle: string;
  title: string;
  bunnyVideoId: string | null;
  bodyMd: string | null;
  isPlayable: boolean;
}

export async function getPreviewLesson(
  courseSlug: string,
  lessonId: string,
): Promise<PreviewLesson | null> {
  const rows = await db
    .select({
      id: lesson.id,
      title: lesson.title,
      bodyMd: lesson.bodyMd,
      isPreview: lesson.isPreview,
      isFree: lesson.isFree,
      videoMediaId: lesson.videoMediaId,
      bunnyVideoId: sql<string | null>`case when ${mediaAsset.storage} = 'bunny_stream' then ${mediaAsset.storageKey} end`.as("bunny_video_id"),
      courseId: course.id,
      courseSlug: course.slug,
      courseTitle: course.title,
    })
    .from(lesson)
    .innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
    .innerJoin(course, eq(courseModule.courseId, course.id))
    .leftJoin(mediaAsset, eq(lesson.videoMediaId, mediaAsset.id))
    .where(
      and(
        eq(lesson.id, lessonId),
        eq(course.slug, courseSlug),
        eq(course.status, "published"),
        isNull(lesson.deletedAt),
        isNull(course.deletedAt),
      ),
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  const playable = row.isPreview || row.isFree;
  return {
    id: row.id,
    courseSlug: row.courseSlug,
    courseTitle: row.courseTitle,
    title: row.title,
    bunnyVideoId: row.bunnyVideoId,
    bodyMd: row.bodyMd,
    isPlayable: playable,
  };
}

export interface CurriculumLesson {
  id: string;
  title: string;
  durationSeconds: number | null;
  isPreview: boolean;
  isFree: boolean;
  sortOrder: number;
}

export interface CurriculumModule {
  id: string;
  title: string;
  sortOrder: number;
  lessons: CurriculumLesson[];
}

export async function getCourseCurriculum(courseId: string): Promise<CurriculumModule[]> {
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

  const lessons = await db
    .select({
      id: lesson.id,
      moduleId: lesson.moduleId,
      title: lesson.title,
      durationSeconds: lesson.durationSeconds,
      isPreview: lesson.isPreview,
      isFree: lesson.isFree,
      sortOrder: lesson.sortOrder,
    })
    .from(lesson)
    .where(isNull(lesson.deletedAt))
    .orderBy(asc(lesson.sortOrder));

  const byModule = new Map<string, CurriculumLesson[]>();
  for (const l of lessons) {
    const list = byModule.get(l.moduleId) ?? [];
    list.push({
      id: l.id,
      title: l.title,
      durationSeconds: l.durationSeconds,
      isPreview: l.isPreview,
      isFree: l.isFree,
      sortOrder: l.sortOrder,
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
