import { describe, it, expect, beforeAll } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { course } from "@/db/schema/course";
import { user } from "@/db/schema/auth";
import { listPublishedCourses, getPublishedCourseBySlug } from "@/server/repos/course";
import { randomUUID } from "node:crypto";

const ADMIN_ID = randomUUID();

beforeAll(async () => {
  await db.execute(sql`TRUNCATE TABLE "lesson", "module", "course", "user" CASCADE`);
  await db
    .insert(user)
    .values({ id: ADMIN_ID, email: "x@y.test", name: "X", role: "admin" });

  for (let i = 0; i < 25; i += 1) {
    await db.insert(course).values({
      slug: `course-${i}`,
      title: `Course ${i}`,
      summary: `summary ${i}`,
      ownerUserId: ADMIN_ID,
      price: "100.00",
      status: "published",
      publishedAt: new Date(2026, 0, i + 1),
      createdByUserId: ADMIN_ID,
    });
  }
  // 1 draft (must not appear)
  await db.insert(course).values({
    slug: "draft-1",
    title: "Draft",
    summary: "x",
    ownerUserId: ADMIN_ID,
    price: "0.00",
    status: "draft",
    createdByUserId: ADMIN_ID,
  });
});

describe("listPublishedCourses", () => {
  it("page 1 returns first 10 of 25, total=25", async () => {
    const r = await listPublishedCourses({ page: 1, per_page: 10 });
    expect(r.data.length).toBe(10);
    expect(r.pagination.total_count).toBe(25);
    expect(r.pagination.total_pages).toBe(3);
    expect(r.pagination.has_next).toBe(true);
    expect(r.pagination.has_prev).toBe(false);
  });

  it("page 3 returns the last 5", async () => {
    const r = await listPublishedCourses({ page: 3, per_page: 10 });
    expect(r.data.length).toBe(5);
    expect(r.pagination.has_next).toBe(false);
    expect(r.pagination.has_prev).toBe(true);
  });

  it("excludes draft courses", async () => {
    const r = await listPublishedCourses({ page: 1, per_page: 100 });
    expect(r.data.find((c) => c.slug === "draft-1")).toBeUndefined();
  });
});

describe("getPublishedCourseBySlug", () => {
  it("returns the course", async () => {
    const c = await getPublishedCourseBySlug("course-1");
    expect(c?.title).toBe("Course 1");
  });

  it("returns null for draft", async () => {
    expect(await getPublishedCourseBySlug("draft-1")).toBeNull();
  });

  it("returns null for unknown", async () => {
    expect(await getPublishedCourseBySlug("does-not-exist")).toBeNull();
  });
});
