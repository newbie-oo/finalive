import {
  pgTable,
  uuid,
  text,
  numeric,
  timestamp,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { course } from "./course";
import { mediaAsset } from "./media";

export const pendingEnrollment = pgTable(
  "pending_enrollment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => course.id),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    refCode: text("ref_code").notNull().unique(),
    status: text("status").notNull().default("awaiting_payment"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    statusChk: check(
      "pe_status_chk",
      sql`${t.status} IN ('awaiting_payment','slip_submitted','paid','expired','cancelled')`,
    ),
    userIdx: index("pe_user_idx").on(t.userId),
    statusIdx: index("pe_status_idx").on(t.status),
    expiresIdx: index("pe_expires_idx").on(t.expiresAt),
    oneActivePending: uniqueIndex("one_active_pending")
      .on(t.userId, t.courseId)
      .where(sql`${t.status} IN ('awaiting_payment','slip_submitted')`),
  }),
);

export const paymentSlip = pgTable(
  "payment_slip",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pendingEnrollmentId: uuid("pending_enrollment_id")
      .notNull()
      .references(() => pendingEnrollment.id),
    imageMediaId: uuid("image_media_id")
      .notNull()
      .references(() => mediaAsset.id),
    expectedAmount: numeric("expected_amount", { precision: 12, scale: 2 }).notNull(),
    reportedAmount: numeric("reported_amount", { precision: 12, scale: 2 }),
    status: text("status").notNull().default("submitted"),
    rejectionReason: text("rejection_reason"),
    rejectionNote: text("rejection_note"),
    idempotencyKey: text("idempotency_key").notNull().unique(),
    reviewedByUserId: text("reviewed_by_user_id"),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    statusChk: check("slip_status_chk", sql`${t.status} IN ('submitted','accepted','rejected')`),
    rejectReasonChk: check(
      "slip_reject_reason_chk",
      sql`${t.status} != 'rejected' OR ${t.rejectionReason} IN ('blurry','wrong_amount','wrong_account','stale_slip','other')`,
    ),
    statusCreatedIdx: index("slip_status_created_idx").on(t.status, t.createdAt),
    pendingIdx: index("slip_pending_idx").on(t.pendingEnrollmentId),
  }),
);

export type PendingEnrollment = typeof pendingEnrollment.$inferSelect;
export type PaymentSlip = typeof paymentSlip.$inferSelect;
