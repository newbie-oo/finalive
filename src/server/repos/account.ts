import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { course } from "@/db/schema/course";
import { pendingEnrollment } from "@/db/schema/payment";
import { enrollment } from "@/db/schema/enrollment";

export interface AccountPendingItem {
  pendingId: string;
  status: string;
  refCode: string;
  amount: string;
  expiresAt: Date;
  courseSlug: string;
  courseTitle: string;
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
  courseSlug: string;
  courseTitle: string;
  priceAtPurchase: string;
  source: string;
  enrolledAt: Date;
}

export async function listAccountEnrollments(userId: string): Promise<AccountEnrollmentItem[]> {
  const rows = await db
    .select({
      enrollmentId: enrollment.id,
      courseSlug: course.slug,
      courseTitle: course.title,
      priceAtPurchase: enrollment.priceAtPurchase,
      source: enrollment.source,
      enrolledAt: enrollment.createdAt,
    })
    .from(enrollment)
    .innerJoin(course, eq(enrollment.courseId, course.id))
    .where(eq(enrollment.userId, userId))
    .orderBy(desc(enrollment.createdAt))
    .limit(50);

  return rows;
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
    })
    .from(pendingEnrollment)
    .innerJoin(course, eq(pendingEnrollment.courseId, course.id))
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
  return Array.from(byCourse.values()).map(({ courseId: _ignored, ...rest }) => rest);
}
