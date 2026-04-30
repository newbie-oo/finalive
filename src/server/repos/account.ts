import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { course, courseModule, lesson } from "@/db/schema/course";
import { pendingEnrollment } from "@/db/schema/payment";
import { enrollment } from "@/db/schema/enrollment";
import { lessonProgress } from "@/db/schema/progress";
import { mediaAsset } from "@/db/schema/media";
import { publicUrl } from "@/server/services/r2";

export interface AccountPendingItem {
  pendingId: string;
  status: string;
  refCode: string;
  amount: string;
  expiresAt: Date;
  courseSlug: string;
  courseTitle: string;
  coverUrl: string | null;
}

// Higher number = stickier row when the same course has multiple pendings.
// "paid" beats everything else so a successful pay doesn't get overshadowed
// by an earlier expired/awaiting attempt for the same course.
const STATUS_PRIORITY: Record<string, number> = {
  paid: 5,
  slip_submitted: 4,
  awaiting_payment: 3,
  expired: 2,
  cancelled: 1,
};

export interface AccountEnrollmentItem {
  enrollmentId: string;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
  priceAtPurchase: string;
  source: string;
  enrolledAt: Date;
  completedAt: Date | null;
  status: string;
  coverUrl: string | null;
  totalLessons: number;
  doneLessons: number;
}

export async function listAccountEnrollments(userId: string): Promise<AccountEnrollmentItem[]> {
  // Per-course lesson totals (only published / non-deleted lessons +
  // modules) so the progress bar matches what the student actually sees.
  const lessonCountByCourse = db
    .select({
      courseId: courseModule.courseId,
      total: sql<number>`count(*)::int`.as("total_lessons"),
    })
    .from(lesson)
    .innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
    .where(sql`${lesson.deletedAt} IS NULL AND ${courseModule.deletedAt} IS NULL`)
    .groupBy(courseModule.courseId)
    .as("lesson_count_by_course");

  // Per-(user, course) completed lesson count.
  const doneByCourse = db
    .select({
      courseId: courseModule.courseId,
      done: sql<number>`count(*)::int`.as("done_lessons"),
    })
    .from(lessonProgress)
    .innerJoin(lesson, eq(lessonProgress.lessonId, lesson.id))
    .innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
    .where(
      sql`${lessonProgress.userId} = ${userId} AND ${lessonProgress.status} = 'completed'`,
    )
    .groupBy(courseModule.courseId)
    .as("done_by_course");

  const rows = await db
    .select({
      enrollmentId: enrollment.id,
      courseId: course.id,
      courseSlug: course.slug,
      courseTitle: course.title,
      priceAtPurchase: enrollment.priceAtPurchase,
      source: enrollment.source,
      enrolledAt: enrollment.createdAt,
      completedAt: enrollment.completedAt,
      status: enrollment.status,
      coverStorageKey: mediaAsset.storageKey,
      totalLessons: lessonCountByCourse.total,
      doneLessons: doneByCourse.done,
    })
    .from(enrollment)
    .innerJoin(course, eq(enrollment.courseId, course.id))
    .leftJoin(mediaAsset, eq(course.coverMediaId, mediaAsset.id))
    .leftJoin(lessonCountByCourse, eq(lessonCountByCourse.courseId, course.id))
    .leftJoin(doneByCourse, eq(doneByCourse.courseId, course.id))
    .where(eq(enrollment.userId, userId))
    .orderBy(desc(enrollment.createdAt))
    .limit(50);

  return rows.map((r) => ({
    enrollmentId: r.enrollmentId,
    courseId: r.courseId,
    courseSlug: r.courseSlug,
    courseTitle: r.courseTitle,
    priceAtPurchase: r.priceAtPurchase,
    source: r.source,
    enrolledAt: r.enrolledAt,
    completedAt: r.completedAt,
    status: r.status,
    coverUrl: r.coverStorageKey
      ? publicUrl(`covers/${r.coverStorageKey}-640.webp`)
      : null,
    totalLessons: r.totalLessons ?? 0,
    doneLessons: r.doneLessons ?? 0,
  }));
}

export async function listAccountPendings(userId: string): Promise<AccountPendingItem[]> {
  const rows = await db
    .select({
      pendingId: pendingEnrollment.id,
      status: pendingEnrollment.status,
      refCode: pendingEnrollment.refCode,
      amount: pendingEnrollment.amount,
      expiresAt: pendingEnrollment.expiresAt,
      courseId: pendingEnrollment.courseId,
      courseSlug: course.slug,
      courseTitle: course.title,
      coverStorageKey: mediaAsset.storageKey,
    })
    .from(pendingEnrollment)
    .innerJoin(course, eq(pendingEnrollment.courseId, course.id))
    .leftJoin(mediaAsset, eq(course.coverMediaId, mediaAsset.id))
    .where(eq(pendingEnrollment.userId, userId))
    .orderBy(desc(pendingEnrollment.createdAt))
    .limit(50);

  // Collapse to one row per course. Without this, the page showed the same
  // course twice when a stale awaiting/expired pending sat alongside a
  // later paid one — confusing for the student.
  const byCourse = new Map<string, typeof rows[number]>();
  for (const r of rows) {
    const existing = byCourse.get(r.courseId);
    const score = (s: string) => STATUS_PRIORITY[s] ?? 0;
    if (!existing || score(r.status) > score(existing.status)) {
      byCourse.set(r.courseId, r);
    }
  }
  return Array.from(byCourse.values()).map((r) => ({
    pendingId: r.pendingId,
    status: r.status,
    refCode: r.refCode,
    amount: r.amount,
    expiresAt: r.expiresAt,
    courseSlug: r.courseSlug,
    courseTitle: r.courseTitle,
    coverUrl: r.coverStorageKey
      ? publicUrl(`covers/${r.coverStorageKey}-640.webp`)
      : null,
  }));
}
