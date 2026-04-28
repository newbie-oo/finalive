import "server-only";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { course } from "@/db/schema/course";
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
