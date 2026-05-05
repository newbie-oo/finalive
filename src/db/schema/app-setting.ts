import { pgTable, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const appSetting = pgTable("app_setting", {
  key: text("key").primaryKey(),
  valueJson: jsonb("value_json").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedByUserId: text("updated_by_user_id").notNull(),
});

export type AppSetting = typeof appSetting.$inferSelect;
export type NewAppSetting = typeof appSetting.$inferInsert;
