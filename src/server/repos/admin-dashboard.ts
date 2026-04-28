import "server-only";
import { and, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { paymentSlip } from "@/db/schema/payment";
import { enrollment } from "@/db/schema/enrollment";
import { course } from "@/db/schema/course";

export interface AdminDashboardCounts {
  slipsSubmitted: number;
  slipsAcceptedToday: number;
  slipsRejectedToday: number;
  enrollmentsActive: number;
  coursesPublished: number;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getAdminDashboardCounts(): Promise<AdminDashboardCounts> {
  const today = startOfToday();
  // 5 small COUNT(*) queries in parallel — cheap, and indexes
  // (slip_status_created_idx, one_active_enrollment partial UK,
  // course_status_published_idx) cover all of them.
  const [submitted, acceptedToday, rejectedToday, activeEnroll, pubCourses] =
    await Promise.all([
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(paymentSlip)
        .where(eq(paymentSlip.status, "submitted")),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(paymentSlip)
        .where(
          and(eq(paymentSlip.status, "accepted"), gte(paymentSlip.reviewedAt, today)),
        ),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(paymentSlip)
        .where(
          and(eq(paymentSlip.status, "rejected"), gte(paymentSlip.reviewedAt, today)),
        ),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(enrollment)
        .where(eq(enrollment.status, "active")),
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(course)
        .where(and(eq(course.status, "published"), isNull(course.deletedAt))),
    ]);

  return {
    slipsSubmitted: submitted[0]?.n ?? 0,
    slipsAcceptedToday: acceptedToday[0]?.n ?? 0,
    slipsRejectedToday: rejectedToday[0]?.n ?? 0,
    enrollmentsActive: activeEnroll[0]?.n ?? 0,
    coursesPublished: pubCourses[0]?.n ?? 0,
  };
}
