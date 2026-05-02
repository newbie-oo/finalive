import { describe, it, expect, beforeAll } from "vitest";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { course, courseModule, lesson } from "@/db/schema/course";
import { user } from "@/db/schema/auth";
import { quiz } from "@/db/schema/quiz";
import { getQuizById } from "@/server/repos/quiz";

const ADMIN_ID = randomUUID();
const COURSE_ID = randomUUID();
const MOD_ID = randomUUID();
const LESSON_ID = randomUUID();
const QUIZ_ID = randomUUID();

beforeAll(async () => {
  await db.execute(
    sql`TRUNCATE TABLE "quiz_choice", "quiz_question", "quiz", "lesson", "module", "course", "user" CASCADE`,
  );
  await db
    .insert(user)
    .values({ id: ADMIN_ID, email: "qbc@y.test", name: "X", role: "admin" });
  await db.insert(course).values({
    id: COURSE_ID,
    slug: "qbc",
    title: "QBC",
    summary: "x",
    ownerUserId: ADMIN_ID,
    price: "0.00",
    status: "published",
    publishedAt: new Date(),
    createdByUserId: ADMIN_ID,
  });
  await db.insert(courseModule).values({
    id: MOD_ID,
    courseId: COURSE_ID,
    title: "M1",
    sortOrder: 1,
    createdByUserId: ADMIN_ID,
  });
  await db.insert(lesson).values({
    id: LESSON_ID,
    moduleId: MOD_ID,
    title: "IRR และ NPV — ตัดสินใจลงทุนโครงการ",
    sortOrder: 1,
    bodyMd: "x",
    createdByUserId: ADMIN_ID,
  });
  await db.insert(quiz).values({
    id: QUIZ_ID,
    lessonId: LESSON_ID,
    title: "Quiz",
    passScorePct: 60,
    createdByUserId: ADMIN_ID,
  });
});

describe("getQuizById exposes the lesson title", () => {
  it("returns lessonTitle so UI can render it instead of UUID prefix", async () => {
    const q = await getQuizById(QUIZ_ID);
    expect(q).not.toBeNull();
    expect(q!.lessonTitle).toBe("IRR และ NPV — ตัดสินใจลงทุนโครงการ");
  });
});
