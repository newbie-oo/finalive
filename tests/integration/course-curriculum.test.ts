import { describe, it, expect, beforeAll } from "vitest";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { course, courseModule, lesson } from "@/db/schema/course";
import { user } from "@/db/schema/auth";
import { getCourseCurriculum } from "@/server/repos/course";

const ADMIN_ID = randomUUID();
const COURSE_ID = randomUUID();
const MOD_WITH_LESSONS = randomUUID();
const MOD_EMPTY = randomUUID();

beforeAll(async () => {
  await db.execute(sql`TRUNCATE TABLE "lesson", "module", "course", "user" CASCADE`);
  await db
    .insert(user)
    .values({ id: ADMIN_ID, email: "curriculum@y.test", name: "X", role: "admin" });

  await db.insert(course).values({
    id: COURSE_ID,
    slug: "curriculum-test",
    title: "Curriculum Test",
    summary: "x",
    ownerUserId: ADMIN_ID,
    price: "0.00",
    status: "published",
    publishedAt: new Date(),
    createdByUserId: ADMIN_ID,
  });

  await db.insert(courseModule).values([
    {
      id: MOD_WITH_LESSONS,
      courseId: COURSE_ID,
      title: "Module With Lessons",
      sortOrder: 1,
      createdByUserId: ADMIN_ID,
    },
    {
      id: MOD_EMPTY,
      courseId: COURSE_ID,
      title: "Empty Module",
      sortOrder: 2,
      createdByUserId: ADMIN_ID,
    },
  ]);

  await db.insert(lesson).values({
    moduleId: MOD_WITH_LESSONS,
    title: "L1",
    sortOrder: 1,
    bodyMd: "content",
    createdByUserId: ADMIN_ID,
  });
});

describe("getCourseCurriculum", () => {
  it("default (admin behavior) includes empty modules", async () => {
    const mods = await getCourseCurriculum(COURSE_ID);
    expect(mods.map((m) => m.title)).toEqual(["Module With Lessons", "Empty Module"]);
    const empty = mods.find((m) => m.id === MOD_EMPTY);
    expect(empty?.lessons.length).toBe(0);
  });

  it("with includeEmptyModules: false excludes modules that have no lessons", async () => {
    const mods = await getCourseCurriculum(COURSE_ID, { includeEmptyModules: false });
    expect(mods.map((m) => m.title)).toEqual(["Module With Lessons"]);
  });

  it("with includeEmptyModules: false still returns module with lessons", async () => {
    const mods = await getCourseCurriculum(COURSE_ID, { includeEmptyModules: false });
    expect(mods[0]?.lessons.length).toBe(1);
    expect(mods[0]?.lessons[0]?.title).toBe("L1");
  });
});
