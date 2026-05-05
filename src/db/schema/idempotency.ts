import {
  pgTable,
  text,
  jsonb,
  timestamp,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

export const idempotencyRecord = pgTable(
  "idempotency_record",
  {
    scope: text("scope").notNull(),
    key: text("key").notNull(),
    responseJson: jsonb("response_json").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.scope, t.key] }),
    expiresIdx: index("ir_expires_idx").on(t.expiresAt),
  }),
);

export type IdempotencyRecord = typeof idempotencyRecord.$inferSelect;
