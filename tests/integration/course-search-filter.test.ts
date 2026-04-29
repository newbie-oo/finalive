import { describe, it, expect, beforeAll } from "vitest";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { course } from "@/db/schema/course";
import { user } from "@/db/schema/auth";
import { listPublishedCourses } from "@/server/repos/course";

const ADMIN_ID = randomUUID();

beforeAll(async () => {
  await db.execute(sql`TRUNCATE TABLE "lesson", "module", "course", "user" CASCADE`);
  await db
    .insert(user)
    .values({ id: ADMIN_ID, email: "search@y.test", name: "X", role: "admin" });

  await db.insert(course).values([
    {
      slug: "excel-finance",
      title: "Excel สำหรับนักวิเคราะห์การเงิน",
      summary: "สูตร Excel ที่ใช้จริง",
      ownerUserId: ADMIN_ID,
      price: "0.00",
      isFree: true,
      status: "published",
      publishedAt: new Date(2026, 1, 1),
      createdByUserId: ADMIN_ID,
    },
    {
      slug: "dcf-valuation",
      title: "DCF Valuation ขั้นสูง",
      summary: "ประเมินมูลค่าหุ้น",
      ownerUserId: ADMIN_ID,
      price: "3990.00",
      isFree: false,
      status: "published",
      publishedAt: new Date(2026, 1, 2),
      createdByUserId: ADMIN_ID,
    },
    {
      slug: "tax-planning",
      title: "การวางแผนภาษีฟรีแลนซ์",
      summary: "ภาษีเงินได้บุคคลธรรมดา",
      ownerUserId: ADMIN_ID,
      price: "1490.00",
      isFree: false,
      status: "published",
      publishedAt: new Date(2026, 1, 3),
      createdByUserId: ADMIN_ID,
    },
  ]);
});

describe("listPublishedCourses search + filter", () => {
  it("default returns all published", async () => {
    const r = await listPublishedCourses({ page: 1, per_page: 50 });
    expect(r.data.length).toBe(3);
  });

  it("filters by case-insensitive title search (q='excel')", async () => {
    const r = await listPublishedCourses({ page: 1, per_page: 50, q: "Excel" });
    expect(r.data.length).toBe(1);
    expect(r.data[0]?.slug).toBe("excel-finance");
  });

  it("matches Thai substring in title or summary (q='ภาษี')", async () => {
    const r = await listPublishedCourses({ page: 1, per_page: 50, q: "ภาษี" });
    expect(r.data.length).toBe(1);
    expect(r.data[0]?.slug).toBe("tax-planning");
  });

  it("freeOnly=true returns only is_free courses", async () => {
    const r = await listPublishedCourses({ page: 1, per_page: 50, freeOnly: true });
    expect(r.data.map((c) => c.slug)).toEqual(["excel-finance"]);
  });

  it("combines q + freeOnly", async () => {
    const r = await listPublishedCourses({ page: 1, per_page: 50, q: "DCF", freeOnly: true });
    expect(r.data.length).toBe(0);
  });

  it("returns empty + correct pagination on no match", async () => {
    const r = await listPublishedCourses({ page: 1, per_page: 50, q: "ไม่มี" });
    expect(r.data.length).toBe(0);
    expect(r.pagination.total_count).toBe(0);
  });
});
