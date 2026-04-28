import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { course } from "@/db/schema/course";
import { pendingEnrollment } from "@/db/schema/payment";

export interface AccountPendingItem {
  pendingId: string;
  status: string;
  refCode: string;
  amount: string;
  expiresAt: Date;
  courseSlug: string;
  courseTitle: string;
}

export async function listAccountPendings(userId: string): Promise<AccountPendingItem[]> {
  const rows = await db
    .select({
      pendingId: pendingEnrollment.id,
      status: pendingEnrollment.status,
      refCode: pendingEnrollment.refCode,
      amount: pendingEnrollment.amount,
      expiresAt: pendingEnrollment.expiresAt,
      courseSlug: course.slug,
      courseTitle: course.title,
    })
    .from(pendingEnrollment)
    .innerJoin(course, eq(pendingEnrollment.courseId, course.id))
    .where(
      and(
        eq(pendingEnrollment.userId, userId),
      ),
    )
    .orderBy(desc(pendingEnrollment.createdAt))
    .limit(50);
  return rows;
}
