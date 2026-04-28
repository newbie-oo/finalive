import "server-only";
import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { course } from "@/db/schema/course";

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
  },
) {
  await db
    .update(course)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(course.id, courseId));
}
