-- Convert quiz_question and quiz_choice unique constraints over (parent, sort_order)
-- to partial unique indexes that ignore soft-deleted rows. The original UNIQUE
-- constraints caused "duplicate key value violates unique constraint qq_sort_uk"
-- errors when saveAdminQuiz soft-deleted a question and immediately inserted a
-- new one at the same sort_order: the soft-deleted row still occupied the slot.

ALTER TABLE "quiz_question" DROP CONSTRAINT IF EXISTS "qq_sort_uk";
CREATE UNIQUE INDEX IF NOT EXISTS "qq_sort_uk"
  ON "quiz_question" ("quiz_id", "sort_order")
  WHERE "deleted_at" IS NULL;

ALTER TABLE "quiz_choice" DROP CONSTRAINT IF EXISTS "qc_sort_uk";
CREATE UNIQUE INDEX IF NOT EXISTS "qc_sort_uk"
  ON "quiz_choice" ("question_id", "sort_order")
  WHERE "deleted_at" IS NULL;
