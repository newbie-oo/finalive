import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  primaryKey,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// NOTE: 14_database_design.md plans monthly partitioning (PARTITION BY RANGE
// (occurred_at)). Drizzle Kit doesn't emit native partitioning, so the table
// is created here as a regular table; a follow-up migration converts it via
// raw SQL when the cron partition manager lands (Sprint 9).
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").notNull().defaultRandom(),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),

    actorType: text("actor_type").notNull(),
    actorUserId: text("actor_user_id"),
    actorAdminImpersonating: text("actor_admin_impersonating"),

    action: text("action").notNull(),
    eventVersion: integer("event_version").notNull().default(1),

    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),

    beforeJson: jsonb("before_json"),
    afterJson: jsonb("after_json"),

    requestId: text("request_id"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    metadataJson: jsonb("metadata_json"),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.occurredAt, t.id] }),
    actorChk: check(
      "audit_actor_chk",
      sql`${t.actorType} IN ('user','system','cron','webhook')`,
    ),
    targetIdx: index("audit_target_idx").on(t.targetType, t.targetId),
    actorIdx: index("audit_actor_idx").on(
      t.actorUserId,
      sql`${t.occurredAt} DESC`,
    ),
    actionIdx: index("audit_action_idx").on(
      t.action,
      sql`${t.occurredAt} DESC`,
    ),
    requestIdx: index("audit_request_idx").on(t.requestId),
  }),
);

export const emailMessage = pgTable(
  "email_message",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id"),
    toEmail: text("to_email").notNull(),
    template: text("template").notNull(),
    paramsJson: jsonb("params_json").notNull(),
    status: text("status").notNull().default("queued"),
    attempts: integer("attempts").notNull().default(0),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    lastError: text("last_error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    statusChk: check(
      "em_status_chk",
      sql`${t.status} IN ('queued','sent','failed')`,
    ),
    dispatchIdx: index("em_dispatch_idx").on(t.status, t.lastAttemptAt),
  }),
);

export type AuditLog = typeof auditLog.$inferSelect;
export type EmailMessage = typeof emailMessage.$inferSelect;
