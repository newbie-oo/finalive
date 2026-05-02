import { describe, it, expect, beforeAll } from "vitest";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { course } from "@/db/schema/course";
import { user } from "@/db/schema/auth";
import { listAdminCourses } from "@/server/repos/admin-course";

const ADMIN = randomUUID();

beforeAll(async () => {
  await db.execute(sql`TRUNCATE TABLE "lesson", "module", "course", "user" CASCADE`);
  await db
    .insert(user)
    .values({ id: ADMIN, email: "ac@y.test", name: "A", role: "admin" });

  const rows = [
    { slug: "ac-pub-excel", title: "Excel Course", status: "published" },
    { slug: "ac-pub-dcf", title: "DCF Course", status: "published" },
    { slug: "ac-draft-tax", title: "Tax Draft", status: "draft" },
    { slug: "ac-archived-old", title: "Archived Old", status: "archived" },
  ] as const;
  for (const r of rows) {
    await db.insert(course).values({
      slug: r.slug,
      title: r.title,
      summary: "x",
      ownerUserId: ADMIN,
      price: "0.00",
      isFree: true,
      status: r.status,
      publishedAt: r.status === "published" ? new Date() : null,
      createdByUserId: ADMIN,
    });
  }
});

describe("listAdminCourses search + status filter", () => {
  it("default returns every non-deleted course", async () => {
    const r = await listAdminCourses();
    expect(r.length).toBe(4);
  });

  it("status=published narrows to published only", async () => {
    const r = await listAdminCourses({ status: "published" });
    expect(r.map((c) => c.slug).sort()).toEqual(["ac-pub-dcf", "ac-pub-excel"]);
  });

  it("status=draft narrows to draft only", async () => {
    const r = await listAdminCourses({ status: "draft" });
    expect(r.length).toBe(1);
    expect(r[0]?.slug).toBe("ac-draft-tax");
  });

  it("q matches title (case-insensitive)", async () => {
    const r = await listAdminCourses({ q: "excel" });
    expect(r.length).toBe(1);
    expect(r[0]?.slug).toBe("ac-pub-excel");
  });

  it("q matches slug substring", async () => {
    const r = await listAdminCourses({ q: "ac-archived" });
    expect(r.length).toBe(1);
    expect(r[0]?.slug).toBe("ac-archived-old");
  });

  it("q + status combine (AND)", async () => {
    const r = await listAdminCourses({ q: "Course", status: "published" });
    expect(r.map((c) => c.slug).sort()).toEqual(["ac-pub-dcf", "ac-pub-excel"]);
  });

  it("status=all is equivalent to omitting", async () => {
    const r = await listAdminCourses({ status: "all" });
    expect(r.length).toBe(4);
  });
});
