import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  boolean,
  timestamp,
  unique,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { lesson } from "./course";
import { quiz } from "./quiz";

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    lessonId: uuid("lesson_id")
      .notNull()
      .references(() => lesson.id),
    watchedSeconds: integer("watched_seconds").notNull().default(0),
    status: text("status").notNull().default("in_progress"),
    lastWatchedAt: timestamp("last_watched_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    statusChk: check(
      "lp_status_chk",
      sql`${t.status} IN ('not_started','in_progress','completed')`,
    ),
    userLessonUk: unique("lp_user_lesson_uk").on(t.userId, t.lessonId),
    userIdx: index("lp_user_idx").on(t.userId),
  }),
);

export const quizAttempt = pgTable(
  "quiz_attempt",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id").notNull(),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quiz.id),
    answersJson: jsonb("answers_json").notNull(),
    scorePct: integer("score_pct").notNull(),
    passed: boolean("passed").notNull(),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    scoreChk: check("qa_score_chk", sql`${t.scorePct} BETWEEN 0 AND 100`),
    userQuizIdx: index("qa_user_quiz_idx").on(t.userId, t.quizId, sql`${t.submittedAt} DESC`),
  }),
);

export type LessonProgress = typeof lessonProgress.$inferSelect;
export type NewLessonProgress = typeof lessonProgress.$inferInsert;
export type QuizAttempt = typeof quizAttempt.$inferSelect;
export type NewQuizAttempt = typeof quizAttempt.$inferInsert;
