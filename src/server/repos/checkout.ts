import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { course } from "@/db/schema/course";
import { pendingEnrollment } from "@/db/schema/payment";

export interface CheckoutPending {
  id: string;
  refCode: string;
  amount: string;
  status: string;
  expiresAt: Date;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
}

export async function getCheckoutPending(
  pendingId: string,
  userId: string,
): Promise<CheckoutPending | null> {
  const rows = await db
    .select({
      id: pendingEnrollment.id,
      refCode: pendingEnrollment.refCode,
      amount: pendingEnrollment.amount,
      status: pendingEnrollment.status,
      expiresAt: pendingEnrollment.expiresAt,
      courseId: course.id,
      courseSlug: course.slug,
      courseTitle: course.title,
    })
    .from(pendingEnrollment)
    .innerJoin(course, eq(pendingEnrollment.courseId, course.id))
    .where(and(eq(pendingEnrollment.id, pendingId), eq(pendingEnrollment.userId, userId)))
    .limit(1);
  return rows[0] ?? null;
}
