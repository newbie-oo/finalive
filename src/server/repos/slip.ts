import "server-only";
import { and, desc, eq, lt, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { paymentSlip, pendingEnrollment } from "@/db/schema/payment";
import { course } from "@/db/schema/course";
import {
  buildCursorResponse,
  decodeCursor,
  type CursorParams,
  type CursorResponse,
} from "@/lib/pagination";

export type SlipQueueStatus = "submitted" | "accepted" | "rejected" | "all";

export interface PendingSlipRow {
  id: string;
  status: string;
  expectedAmount: string;
  reportedAmount: string | null;
  createdAt: Date;
  pendingId: string;
  refCode: string;
  studentUserId: string;
  courseId: string;
  courseSlug: string;
  courseTitle: string;
}

export interface ListPendingSlipsParams extends CursorParams {
  status?: SlipQueueStatus;
}

export async function listPendingSlips(
  params: ListPendingSlipsParams,
): Promise<CursorResponse<PendingSlipRow>> {
  const status = params.status ?? "submitted";
  const cursor = decodeCursor(params.cursor);

  // Order by (createdAt DESC, id DESC) to keep cursor key stable when many
  // slips share a created_at second. The cursor is the boundary "last seen
  // (created_at, id)" — next page is rows strictly older OR (same ts AND id <).
  const cursorPredicate = cursor
    ? or(
        lt(paymentSlip.createdAt, new Date(cursor.created_at)),
        and(
          eq(paymentSlip.createdAt, new Date(cursor.created_at)),
          lt(paymentSlip.id, cursor.id),
        ),
      )
    : undefined;

  const statusPredicate =
    status === "all" ? undefined : eq(paymentSlip.status, status);

  const where = and(...[statusPredicate, cursorPredicate].filter((p) => p !== undefined));

  const rows = await db
    .select({
      id: paymentSlip.id,
      status: paymentSlip.status,
      expectedAmount: paymentSlip.expectedAmount,
      reportedAmount: paymentSlip.reportedAmount,
      createdAt: paymentSlip.createdAt,
      pendingId: pendingEnrollment.id,
      refCode: pendingEnrollment.refCode,
      studentUserId: pendingEnrollment.userId,
      courseId: course.id,
      courseSlug: course.slug,
      courseTitle: course.title,
    })
    .from(paymentSlip)
    .innerJoin(pendingEnrollment, eq(paymentSlip.pendingEnrollmentId, pendingEnrollment.id))
    .innerJoin(course, eq(pendingEnrollment.courseId, course.id))
    .where(where)
    .orderBy(desc(paymentSlip.createdAt), desc(paymentSlip.id))
    .limit(params.per_page);

  return buildCursorResponse(rows, params);
}

export async function countPendingSlipsByStatus(): Promise<Record<string, number>> {
  const rows = await db
    .select({
      status: paymentSlip.status,
      total: sql<number>`count(*)::int`,
    })
    .from(paymentSlip)
    .groupBy(paymentSlip.status);
  const out: Record<string, number> = { submitted: 0, accepted: 0, rejected: 0 };
  for (const r of rows) out[r.status] = r.total;
  return out;
}
