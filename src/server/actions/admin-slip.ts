import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { paymentSlip, pendingEnrollment } from "@/db/schema/payment";
import { course } from "@/db/schema/course";
import { enrollment } from "@/db/schema/enrollment";
import { user as userTable } from "@/db/schema/auth";
import { ApiError } from "@/lib/api-error";
import { requireRole } from "../auth-session";
import { enqueueEmail } from "../services/email-queue";
import { logAudit } from "../services/audit";
import { isUniqueViolation } from "@/lib/pg-error";
import {
  REJECT_REASONS,
  REJECT_REASON_LABEL,
  type RejectReason,
} from "@/components/admin/slip-reject-options";

export { REJECT_REASONS, REJECT_REASON_LABEL };
export type { RejectReason };

export interface RejectSlipInput {
  slipId: string;
  reason: RejectReason;
  note?: string;
}

export interface RejectSlipResult {
  slipId: string;
  pendingId: string;
}

export interface AcceptSlipResult {
  slipId: string;
  enrollmentId: string;
}

export async function acceptSlip(slipId: string): Promise<AcceptSlipResult> {
  const { user: admin } = await requireRole("admin");

  // Pull slip + pending + course + student email up-front (read-only) so the
  // TX is short. We re-check status inside the TX with a conditional UPDATE
  // to defend against double-clicks racing with another admin.
  const rows = await db
    .select({
      slipId: paymentSlip.id,
      slipStatus: paymentSlip.status,
      pendingId: pendingEnrollment.id,
      pendingStatus: pendingEnrollment.status,
      pendingAmount: pendingEnrollment.amount,
      pendingRefCode: pendingEnrollment.refCode,
      studentUserId: pendingEnrollment.userId,
      studentEmail: userTable.email,
      studentName: userTable.name,
      courseId: course.id,
      courseTitle: course.title,
      courseSlug: course.slug,
    })
    .from(paymentSlip)
    .innerJoin(pendingEnrollment, eq(paymentSlip.pendingEnrollmentId, pendingEnrollment.id))
    .innerJoin(course, eq(pendingEnrollment.courseId, course.id))
    .innerJoin(userTable, eq(pendingEnrollment.userId, userTable.id))
    .where(eq(paymentSlip.id, slipId))
    .limit(1);

  const row = rows[0];
  if (!row) throw new ApiError("not_found", "slip not found");
  if (row.slipStatus !== "submitted") {
    throw new ApiError("slip_already_reviewed", "slip is not pending review");
  }

  const enrollmentId = await db.transaction(async (tx) => {
    // Conditional UPDATE — only flips when still 'submitted'. If two admins
    // race, the loser's update affects 0 rows and we abort.
    const updated = await tx
      .update(paymentSlip)
      .set({
        status: "accepted",
        reviewedByUserId: admin.id,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(paymentSlip.id, slipId), eq(paymentSlip.status, "submitted")))
      .returning({ id: paymentSlip.id });
    if (updated.length === 0) {
      throw new ApiError("slip_already_reviewed", "slip was reviewed by another admin");
    }

    await tx
      .update(pendingEnrollment)
      .set({ status: "paid", updatedAt: new Date() })
      .where(eq(pendingEnrollment.id, row.pendingId));

    let createdEnrollmentId: string;
    try {
      const inserted = await tx
        .insert(enrollment)
        .values({
          userId: row.studentUserId,
          courseId: row.courseId,
          source: "paid",
          sourcePendingId: row.pendingId,
          priceAtPurchase: row.pendingAmount,
          status: "active",
        })
        .returning({ id: enrollment.id });
      const created = inserted[0];
      if (!created) throw new ApiError("internal_error", "enrollment insert failed");
      createdEnrollmentId = created.id;
    } catch (e) {
      if (isUniqueViolation(e, "one_active_enrollment")) {
        // Idempotency / concurrent grant: another active enrollment already
        // exists for this (user, course). Surface a typed error so the admin
        // can investigate (probably an admin_grant beat them to it).
        throw new ApiError(
          "enrollment_already_active",
          "นักเรียนมีสิทธิ์เรียนคอร์สนี้อยู่แล้ว",
        );
      }
      throw e;
    }

    await enqueueEmail(
      {
        toEmail: row.studentEmail,
        template: "slip_accepted",
        paramsJson: {
          name: row.studentName,
          courseTitle: row.courseTitle,
          courseSlug: row.courseSlug,
          refCode: row.pendingRefCode,
          amount: row.pendingAmount,
        },
        userId: row.studentUserId,
      },
      tx,
    );

    await logAudit(
      {
        actorType: "user",
        actorUserId: admin.id,
        action: "payment_slip.accepted",
        targetType: "payment_slip",
        targetId: slipId,
        afterJson: {
          enrollmentId: createdEnrollmentId,
          pendingId: row.pendingId,
          refCode: row.pendingRefCode,
        },
      },
      tx,
    );

    return createdEnrollmentId;
  });

  return { slipId, enrollmentId };
}

export async function rejectSlip(input: RejectSlipInput): Promise<RejectSlipResult> {
  const { user: admin } = await requireRole("admin");

  const rows = await db
    .select({
      slipStatus: paymentSlip.status,
      pendingId: pendingEnrollment.id,
      pendingRefCode: pendingEnrollment.refCode,
      pendingAmount: pendingEnrollment.amount,
      studentUserId: pendingEnrollment.userId,
      studentEmail: userTable.email,
      studentName: userTable.name,
      courseTitle: course.title,
      courseSlug: course.slug,
    })
    .from(paymentSlip)
    .innerJoin(pendingEnrollment, eq(paymentSlip.pendingEnrollmentId, pendingEnrollment.id))
    .innerJoin(course, eq(pendingEnrollment.courseId, course.id))
    .innerJoin(userTable, eq(pendingEnrollment.userId, userTable.id))
    .where(eq(paymentSlip.id, input.slipId))
    .limit(1);

  const row = rows[0];
  if (!row) throw new ApiError("not_found", "slip not found");
  if (row.slipStatus !== "submitted") {
    throw new ApiError("slip_already_reviewed", "slip is not pending review");
  }

  await db.transaction(async (tx) => {
    const updated = await tx
      .update(paymentSlip)
      .set({
        status: "rejected",
        rejectionReason: input.reason,
        rejectionNote: input.note ?? null,
        reviewedByUserId: admin.id,
        reviewedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(paymentSlip.id, input.slipId), eq(paymentSlip.status, "submitted")))
      .returning({ id: paymentSlip.id });
    if (updated.length === 0) {
      throw new ApiError("slip_already_reviewed", "slip was reviewed by another admin");
    }

    // Bounce pending back to awaiting_payment so the student can re-upload.
    await tx
      .update(pendingEnrollment)
      .set({ status: "awaiting_payment", updatedAt: new Date() })
      .where(eq(pendingEnrollment.id, row.pendingId));

    await enqueueEmail(
      {
        toEmail: row.studentEmail,
        template: "slip_rejected",
        paramsJson: {
          name: row.studentName,
          courseTitle: row.courseTitle,
          courseSlug: row.courseSlug,
          refCode: row.pendingRefCode,
          amount: row.pendingAmount,
          reason: input.reason,
          reasonLabel: REJECT_REASON_LABEL[input.reason],
          note: input.note ?? null,
        },
        userId: row.studentUserId,
      },
      tx,
    );

    await logAudit(
      {
        actorType: "user",
        actorUserId: admin.id,
        action: "payment_slip.rejected",
        targetType: "payment_slip",
        targetId: input.slipId,
        afterJson: {
          pendingId: row.pendingId,
          refCode: row.pendingRefCode,
          reason: input.reason,
          note: input.note ?? null,
        },
      },
      tx,
    );
  });

  return { slipId: input.slipId, pendingId: row.pendingId };
}
