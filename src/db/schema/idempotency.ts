import {
  pgTable,
  text,
  jsonb,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";

export const idempotencyRecord = pgTable(
  "idempotency_record",
  {
    scope: text("scope").notNull(),
    key: text("key").notNull(),
    responseJson: jsonb("response_json").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.scope, t.key] }),
  }),
);

export type IdempotencyRecord = typeof idempotencyRecord.$inferSelect;
