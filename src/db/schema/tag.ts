import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  primaryKey,
  index,
} from "drizzle-orm/pg-core";

export const tag = pgTable("tag", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  labelTh: text("label_th").notNull(),
  labelEn: text("label_en"),
  kind: text("kind").notNull(), // 'topic' | 'level' | 'lang' | 'misc'
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Polymorphic — entity_id has no FK; app validates entity_type + id existence.
export const entityTag = pgTable(
  "entity_tag",
  {
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tag.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(), // 'course' | 'lesson' | 'user'
    entityId: uuid("entity_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.tagId, t.entityType, t.entityId] }),
    lookup: index("entity_tag_lookup_idx").on(t.entityType, t.entityId),
  }),
);

export type Tag = typeof tag.$inferSelect;
export type EntityTag = typeof entityTag.$inferSelect;
