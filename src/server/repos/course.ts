import "server-only";
import { and, asc, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { course, courseModule, lesson } from "@/db/schema/course";
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
      })
      .from(course)
      .where(where)
      .orderBy(desc(course.publishedAt))
      .limit(params.per_page)
      .offset((params.page - 1) * params.per_page),
    db.select({ value: count() }).from(course).where(where),
  ]);

  const total = totalRows[0]?.value ?? 0;
  return buildOffsetResponse(rows, total, params);
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
    })
    .from(course)
    .where(
      and(eq(course.slug, slug), eq(course.status, "published"), isNull(course.deletedAt)),
    )
    .limit(1);
  return rows[0] ?? null;
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
