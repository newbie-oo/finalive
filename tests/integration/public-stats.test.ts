import { describe, it, expect, beforeAll } from "vitest";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { course } from "@/db/schema/course";
import { user } from "@/db/schema/auth";
import { enrollment } from "@/db/schema/enrollment";
import { getPublicHomeStats } from "@/server/repos/stats";

const ADMIN_ID = randomUUID();

beforeAll(async () => {
  await db.execute(sql`TRUNCATE TABLE "enrollment", "course", "user" CASCADE`);
  await db.insert(user).values([
    { id: ADMIN_ID, email: "stats-admin@y.test", name: "A", role: "admin" },
    { id: randomUUID(), email: "stats-s1@y.test", name: "S1", role: "user" },
    { id: randomUUID(), email: "stats-s2@y.test", name: "S2", role: "user" },
    { id: randomUUID(), email: "stats-s3@y.test", name: "S3", role: "user" },
  ]);
  for (let i = 0; i < 3; i += 1) {
    await db.insert(course).values({
      slug: `stats-pub-${i}`,
      title: `S${i}`,
      summary: "x",
      ownerUserId: ADMIN_ID,
      price: "0.00",
      isFree: true,
      status: "published",
      publishedAt: new Date(),
      createdByUserId: ADMIN_ID,
    });
  }
  await db.insert(course).values({
    slug: "stats-draft",
    title: "draft",
    summary: "x",
    ownerUserId: ADMIN_ID,
    price: "0.00",
    isFree: true,
    status: "draft",
    createdByUserId: ADMIN_ID,
  });

  // Insert 2 active enrollments (distinct students)
  const studentRows = await db
    .select({ id: user.id })
    .from(user)
    .where(sql`${user.email} IN ('stats-s1@y.test','stats-s2@y.test')`);
  const courseRow = (
    await db.select({ id: course.id }).from(course).where(sql`${course.slug}='stats-pub-0'`)
  )[0]!;
  for (const s of studentRows) {
    await db.insert(enrollment).values({
      userId: s.id,
      courseId: courseRow.id,
      status: "active",
      source: "free_course",
    });
  }
});

describe("getPublicHomeStats", () => {
  it("returns counts of published courses and distinct active students", async () => {
    const s = await getPublicHomeStats();
    expect(s.publishedCourses).toBe(3);
    expect(s.activeStudents).toBe(2);
  });
});
