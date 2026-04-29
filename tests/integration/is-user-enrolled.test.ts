import { describe, it, expect, beforeAll } from "vitest";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { course } from "@/db/schema/course";
import { user } from "@/db/schema/auth";
import { enrollment } from "@/db/schema/enrollment";
import { isUserEnrolledInCourse } from "@/server/repos/course";

const ADMIN = randomUUID();
const ENROLLED = randomUUID();
const NOT_ENROLLED = randomUUID();
const CANCELLED = randomUUID();
const COURSE_ID = randomUUID();

beforeAll(async () => {
  await db.execute(sql`TRUNCATE TABLE "enrollment", "course", "user" CASCADE`);
  await db.insert(user).values([
    { id: ADMIN, email: "ie-a@y.test", name: "A", role: "admin" },
    { id: ENROLLED, email: "ie-e@y.test", name: "E", role: "user" },
    { id: NOT_ENROLLED, email: "ie-n@y.test", name: "N", role: "user" },
    { id: CANCELLED, email: "ie-c@y.test", name: "C", role: "user" },
  ]);
  await db.insert(course).values({
    id: COURSE_ID,
    slug: "ie-course",
    title: "T",
    summary: "x",
    ownerUserId: ADMIN,
    price: "0.00",
    isFree: true,
    status: "published",
    publishedAt: new Date(),
    createdByUserId: ADMIN,
  });
  await db.insert(enrollment).values([
    { userId: ENROLLED, courseId: COURSE_ID, status: "active", source: "free_course" },
    { userId: CANCELLED, courseId: COURSE_ID, status: "cancelled", source: "free_course" },
  ]);
});

describe("isUserEnrolledInCourse", () => {
  it("returns true for an active enrollment", async () => {
    expect(await isUserEnrolledInCourse(ENROLLED, COURSE_ID)).toBe(true);
  });

  it("returns false when the user has no enrollment row", async () => {
    expect(await isUserEnrolledInCourse(NOT_ENROLLED, COURSE_ID)).toBe(false);
  });

  it("returns false when the only enrollment is cancelled", async () => {
    expect(await isUserEnrolledInCourse(CANCELLED, COURSE_ID)).toBe(false);
  });
});
