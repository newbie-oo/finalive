import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { course } from "@/db/schema/course";
import { paymentSlip, pendingEnrollment } from "@/db/schema/payment";

export interface CheckoutPending {
  id: string;
  refCode: string;
  amount: string;
  status: string;
  expiresAt: Date;
  updatedAt: Date;
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
      updatedAt: pendingEnrollment.updatedAt,
      courseId: course.id,
      courseSlug: course.slug,
      courseTitle: course.title,
    })
    .from(pendingEnrollment)
    .innerJoin(course, eq(pendingEnrollment.courseId, course.id))
    .where(
      and(
        eq(pendingEnrollment.id, pendingId),
        eq(pendingEnrollment.userId, userId),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export interface LatestSlipInfo {
  status: string;
  rejectionReason: string | null;
  rejectionNote: string | null;
}

export async function getLatestSlipForPending(
  pendingId: string,
): Promise<LatestSlipInfo | null> {
  const rows = await db
    .select({
      status: paymentSlip.status,
      rejectionReason: paymentSlip.rejectionReason,
      rejectionNote: paymentSlip.rejectionNote,
    })
    .from(paymentSlip)
    .where(eq(paymentSlip.pendingEnrollmentId, pendingId))
    .orderBy(desc(paymentSlip.createdAt))
    .limit(1);
  return rows[0] ?? null;
}
