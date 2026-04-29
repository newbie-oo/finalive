import { describe, it, expect, beforeAll } from "vitest";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { course } from "@/db/schema/course";
import { user } from "@/db/schema/auth";
import { enrollment } from "@/db/schema/enrollment";
import { listGrantableCoursesForUser } from "@/server/repos/admin-course";

const ADMIN_ID = randomUUID();
const STUDENT_ID = randomUUID();
const PUB_1 = randomUUID();
const PUB_2 = randomUUID();
const PUB_3 = randomUUID();
const DRAFT = randomUUID();
const ARCHIVED = randomUUID();

beforeAll(async () => {
  await db.execute(sql`TRUNCATE TABLE "enrollment", "course", "user" CASCADE`);
  await db.insert(user).values([
    { id: ADMIN_ID, email: "g-admin@y.test", name: "A", role: "admin" },
    { id: STUDENT_ID, email: "g-student@y.test", name: "S", role: "user" },
  ]);
  await db.insert(course).values([
    {
      id: PUB_1,
      slug: "g-pub-1",
      title: "Pub 1",
      summary: "x",
      ownerUserId: ADMIN_ID,
      price: "0.00",
      isFree: true,
      status: "published",
      publishedAt: new Date(),
      createdByUserId: ADMIN_ID,
    },
    {
      id: PUB_2,
      slug: "g-pub-2",
      title: "Pub 2",
      summary: "x",
      ownerUserId: ADMIN_ID,
      price: "0.00",
      isFree: true,
      status: "published",
      publishedAt: new Date(),
      createdByUserId: ADMIN_ID,
    },
    {
      id: PUB_3,
      slug: "g-pub-3",
      title: "Pub 3 (already enrolled)",
      summary: "x",
      ownerUserId: ADMIN_ID,
      price: "0.00",
      isFree: true,
      status: "published",
      publishedAt: new Date(),
      createdByUserId: ADMIN_ID,
    },
    {
      id: DRAFT,
      slug: "g-draft",
      title: "Draft",
      summary: "x",
      ownerUserId: ADMIN_ID,
      price: "0.00",
      isFree: true,
      status: "draft",
      createdByUserId: ADMIN_ID,
    },
    {
      id: ARCHIVED,
      slug: "g-arch",
      title: "Archived",
      summary: "x",
      ownerUserId: ADMIN_ID,
      price: "0.00",
      isFree: true,
      status: "archived",
      createdByUserId: ADMIN_ID,
    },
  ]);
  await db.insert(enrollment).values({
    userId: STUDENT_ID,
    courseId: PUB_3,
    status: "active",
    source: "free_course",
  });
});

describe("listGrantableCoursesForUser", () => {
  it("only includes published courses the student is not already enrolled in", async () => {
    const list = await listGrantableCoursesForUser(STUDENT_ID);
    const titles = list.map((c) => c.title).sort();
    expect(titles).toEqual(["Pub 1", "Pub 2"]);
  });

  it("excludes draft courses", async () => {
    const list = await listGrantableCoursesForUser(STUDENT_ID);
    expect(list.find((c) => c.title === "Draft")).toBeUndefined();
  });

  it("excludes archived courses", async () => {
    const list = await listGrantableCoursesForUser(STUDENT_ID);
    expect(list.find((c) => c.title === "Archived")).toBeUndefined();
  });
});
