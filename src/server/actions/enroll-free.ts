"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { course } from "@/db/schema/course";
import { enrollment } from "@/db/schema/enrollment";
import { ApiError } from "@/lib/api-error";
import { requireSession } from "@/server/auth-session";

export interface EnrollFreeResult {
  ok: true;
  courseSlug: string;
}

export async function enrollFreeCourse(courseSlug: string): Promise<EnrollFreeResult> {
  const { user } = await requireSession("/login");

  const courseRow = (
    await db
      .select({ id: course.id, slug: course.slug, isFree: course.isFree, status: course.status })
      .from(course)
      .where(eq(course.slug, courseSlug))
      .limit(1)
  )[0];

  if (!courseRow) throw new ApiError("not_found", "course not found");
  if (courseRow.status !== "published") throw new ApiError("invalid_state", "course not published");
  if (!courseRow.isFree) throw new ApiError("invalid_state", "this course is not free");

  // Idempotent: if already enrolled, just return success.
  const existing = await db
    .select({ id: enrollment.id })
    .from(enrollment)
    .where(
      and(
        eq(enrollment.userId, user.id),
        eq(enrollment.courseId, courseRow.id),
        eq(enrollment.status, "active"),
      ),
    )
    .limit(1);

  if (existing[0]) {
    return { ok: true, courseSlug: courseRow.slug };
  }

  await db.insert(enrollment).values({
    userId: user.id,
    courseId: courseRow.id,
    source: "free_course",
    priceAtPurchase: "0",
    status: "active",
  });

  return { ok: true, courseSlug: courseRow.slug };
}
