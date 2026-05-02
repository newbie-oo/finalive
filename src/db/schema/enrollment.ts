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
import { pendingEnrollment } from "./payment";

export const adminGrant = pgTable(
  "admin_grant",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    adminUserId: text("admin_user_id").notNull(),
    studentUserId: text("student_user_id").notNull(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => course.id),
    reason: text("reason").notNull(),
    note: text("note"),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    reasonChk: check(
      "grant_reason_chk",
      sql`${t.reason} IN ('promo','gift','comp','refund_replacement','other')`,
    ),
    studentIdx: index("grant_student_idx").on(t.studentUserId),
    courseIdx: index("grant_course_idx").on(t.courseId),
  }),
);

export const enrollment = pgTable(
  "enrollment",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => course.id),
    source: text("source").notNull(),
    sourcePendingId: uuid("source_pending_id").references(() => pendingEnrollment.id),
    sourceGrantId: uuid("source_grant_id").references(() => adminGrant.id),
    priceAtPurchase: numeric("price_at_purchase", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    status: text("status").notNull().default("active"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    sourceChk: check(
      "enroll_source_chk",
      sql`${t.source} IN ('paid','free_course','admin_grant')`,
    ),
    statusChk: check("enroll_status_chk", sql`${t.status} IN ('active','cancelled')`),
    sourceIdChk: check(
      "enroll_source_id_chk",
      sql`(${t.source} = 'paid' AND ${t.sourcePendingId} IS NOT NULL AND ${t.sourceGrantId} IS NULL)
        OR (${t.source} = 'admin_grant' AND ${t.sourceGrantId} IS NOT NULL AND ${t.sourcePendingId} IS NULL)
        OR (${t.source} = 'free_course' AND ${t.sourcePendingId} IS NULL AND ${t.sourceGrantId} IS NULL)`,
    ),
    userIdx: index("enroll_user_idx").on(t.userId),
    courseIdx: index("enroll_course_idx").on(t.courseId),
    oneActiveEnrollment: uniqueIndex("one_active_enrollment")
      .on(t.userId, t.courseId)
      .where(sql`${t.status} = 'active'`),
  }),
);

export type Enrollment = typeof enrollment.$inferSelect;
export type NewEnrollment = typeof enrollment.$inferInsert;
export type AdminGrant = typeof adminGrant.$inferSelect;
