import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { course } from "@/db/schema/course";
import { pendingEnrollment } from "@/db/schema/payment";
import { ApiError } from "@/lib/api-error";
import { isUniqueViolation } from "@/lib/pg-error";
import { generateRefCode } from "../services/ref-code";
import { requireSession } from "../auth-session";

const PENDING_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const MAX_REF_CODE_RETRIES = 5;

export interface CreatePendingResult {
  id: string;
  refCode: string;
  amount: string;
  expiresAt: Date;
}

export async function createPendingEnrollment(
  courseSlug: string,
): Promise<CreatePendingResult> {
  const { user } = await requireSession("/login");

  const courseRow = (
    await db
      .select({
        id: course.id,
        price: course.price,
        isFree: course.isFree,
        status: course.status,
      })
      .from(course)
      .where(eq(course.slug, courseSlug))
      .limit(1)
  )[0];
  if (!courseRow) throw new ApiError("not_found", "course not found");
  if (courseRow.status !== "published") throw new ApiError("invalid_state", "course not published");
  if (courseRow.isFree) throw new ApiError("invalid_state", "free course — no payment required");

  // Reuse an existing in-flight pending if one exists (partial unique enforces this).
  const existing = await db
    .select()
    .from(pendingEnrollment)
    .where(
      and(
        eq(pendingEnrollment.userId, user.id),
        eq(pendingEnrollment.courseId, courseRow.id),
        inArray(pendingEnrollment.status, ["awaiting_payment", "slip_submitted"]),
      ),
    )
    .limit(1);
  if (existing[0]) {
    return {
      id: existing[0].id,
      refCode: existing[0].refCode,
      amount: existing[0].amount,
      expiresAt: existing[0].expiresAt,
    };
  }

  const expiresAt = new Date(Date.now() + PENDING_TTL_MS);
  for (let attempt = 0; attempt < MAX_REF_CODE_RETRIES; attempt += 1) {
    const refCode = generateRefCode();
    try {
      const [row] = await db
        .insert(pendingEnrollment)
        .values({
          userId: user.id,
          courseId: courseRow.id,
          amount: courseRow.price,
          refCode,
          status: "awaiting_payment",
          expiresAt,
        })
        .returning({
          id: pendingEnrollment.id,
          refCode: pendingEnrollment.refCode,
          amount: pendingEnrollment.amount,
          expiresAt: pendingEnrollment.expiresAt,
        });
      if (!row) throw new ApiError("internal_error", "insert returned no rows");
      return row;
    } catch (e: unknown) {
      // Match by SQLSTATE + constraint name; substring-matching error
      // messages breaks under PG locale changes / version bumps.
      if (isUniqueViolation(e, "pending_enrollment_ref_code_unique")) continue;
      if (isUniqueViolation(e, "one_active_pending")) {
        throw new ApiError("conflict", "another pending enrollment already exists");
      }
      throw e;
    }
  }
  throw new ApiError("internal_error", "could not generate unique ref code");
}
