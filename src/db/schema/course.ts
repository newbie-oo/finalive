import {
  pgTable,
  uuid,
  text,
  boolean,
  integer,
  numeric,
  timestamp,
  index,
  uniqueIndex,
  unique,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { mediaAsset } from "./media";

export const course = pgTable(
  "course",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Slug uniqueness is enforced via a partial index below
    // (WHERE deleted_at IS NULL) so soft-deleted rows can free up their slug.
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull(),
    descriptionMd: text("description_md"),
    coverMediaId: uuid("cover_media_id").references(() => mediaAsset.id),
    ownerUserId: text("owner_user_id").notNull(),
    price: numeric("price", { precision: 12, scale: 2 }).notNull().default("0"),
    isFree: boolean("is_free").notNull().default(false),
    status: text("status").notNull().default("draft"),
    sortOrder: integer("sort_order").notNull().default(0),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdByUserId: text("created_by_user_id").notNull(),
    updatedByUserId: text("updated_by_user_id"),
  },
  (t) => ({
    statusChk: check(
      "course_status_chk",
      sql`${t.status} IN ('draft','published','archived')`,
    ),
    priceChk: check("course_price_chk", sql`${t.price} >= 0`),
    statusPublishedIdx: index("course_status_published_idx")
      .on(t.status, sql`${t.publishedAt} DESC`)
      .where(sql`${t.deletedAt} IS NULL`),
    ownerIdx: index("course_owner_idx").on(t.ownerUserId),
    slugIdx: uniqueIndex("course_slug_idx")
      .on(t.slug)
      .where(sql`${t.deletedAt} IS NULL`),
  }),
);

export const courseModule = pgTable(
  "module",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => course.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    descriptionMd: text("description_md"),
    sortOrder: integer("sort_order").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdByUserId: text("created_by_user_id").notNull(),
    updatedByUserId: text("updated_by_user_id"),
  },
  (t) => ({
    sortUk: unique("module_sort_uk").on(t.courseId, t.sortOrder),
    courseIdx: index("module_course_idx")
      .on(t.courseId)
      .where(sql`${t.deletedAt} IS NULL`),
  }),
);

export const lesson = pgTable(
  "lesson",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => courseModule.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    // Stores either Markdown (legacy seed data) or sanitized HTML
    // (Tiptap-authored). MarkdownView auto-detects by leading `<` and
    // routes to the appropriate renderer. Column kept as `body_md` for
    // backward compatibility — see lib/markdown.tsx for rendering.
    bodyMd: text("body_md"),
    videoMediaId: uuid("video_media_id").references(() => mediaAsset.id),
    durationSeconds: integer("duration_seconds"),
    isPreview: boolean("is_preview").notNull().default(false),
    isFree: boolean("is_free").notNull().default(false),
    sortOrder: integer("sort_order").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdByUserId: text("created_by_user_id").notNull(),
    updatedByUserId: text("updated_by_user_id"),
  },
  (t) => ({
    sortUk: unique("lesson_sort_uk").on(t.moduleId, t.sortOrder),
    contentChk: check(
      "lesson_content_chk",
      sql`${t.bodyMd} IS NOT NULL OR ${t.videoMediaId} IS NOT NULL`,
    ),
    moduleIdx: index("lesson_module_idx")
      .on(t.moduleId)
      .where(sql`${t.deletedAt} IS NULL`),
  }),
);

export const courseCollaborator = pgTable(
  "course_collaborator",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    courseId: uuid("course_id")
      .notNull()
      .references(() => course.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    role: text("role").notNull(),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
    grantedByUserId: text("granted_by_user_id").notNull(),
  },
  (t) => ({
    roleChk: check(
      "collab_role_chk",
      sql`${t.role} IN ('instructor','editor','viewer')`,
    ),
    uniq: unique("collab_unique").on(t.courseId, t.userId),
    userIdx: index("collab_user_idx").on(t.userId),
  }),
);

export type Course = typeof course.$inferSelect;
export type NewCourse = typeof course.$inferInsert;
export type CourseModule = typeof courseModule.$inferSelect;
export type Lesson = typeof lesson.$inferSelect;
