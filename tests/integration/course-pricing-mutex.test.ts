import { describe, it, expect, beforeAll } from "vitest";
import { sql, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { course } from "@/db/schema/course";
import { user } from "@/db/schema/auth";
import { createAdminCourse, updateAdminCourse } from "@/server/repos/admin-course";

const ADMIN_ID = randomUUID();

beforeAll(async () => {
  await db.execute(sql`TRUNCATE TABLE "lesson", "module", "course", "user" CASCADE`);
  await db
    .insert(user)
    .values({ id: ADMIN_ID, email: "pricing@y.test", name: "X", role: "admin" });
});

async function getRow(courseId: string) {
  const [row] = await db
    .select({ price: course.price, isFree: course.isFree })
    .from(course)
    .where(eq(course.id, courseId));
  return row!;
}

describe("price ↔ isFree mutual exclusion", () => {
  it("createAdminCourse with isFree=true forces price to 0 even if non-zero was passed", async () => {
    const id = await createAdminCourse({
      slug: `pm-${randomUUID()}`,
      title: "Free But Priced",
      summary: "x",
      price: "1990.00",
      isFree: true,
      ownerUserId: ADMIN_ID,
    });
    const row = await getRow(id);
    expect(row.isFree).toBe(true);
    expect(Number(row.price)).toBe(0);
  });

  it("createAdminCourse with isFree=false preserves the price", async () => {
    const id = await createAdminCourse({
      slug: `pm-${randomUUID()}`,
      title: "Paid",
      summary: "x",
      price: "1990.00",
      isFree: false,
      ownerUserId: ADMIN_ID,
    });
    const row = await getRow(id);
    expect(row.isFree).toBe(false);
    expect(Number(row.price)).toBe(1990);
  });

  it("updateAdminCourse setting isFree=true forces price=0 in same update", async () => {
    const id = await createAdminCourse({
      slug: `pm-${randomUUID()}`,
      title: "Was Paid",
      summary: "x",
      price: "1990.00",
      isFree: false,
      ownerUserId: ADMIN_ID,
    });
    await updateAdminCourse(id, { isFree: true, price: "1990.00" });
    const row = await getRow(id);
    expect(row.isFree).toBe(true);
    expect(Number(row.price)).toBe(0);
  });

  it("updateAdminCourse with only isFree=true (no price) also zeroes price", async () => {
    const id = await createAdminCourse({
      slug: `pm-${randomUUID()}`,
      title: "Was Paid 2",
      summary: "x",
      price: "1990.00",
      isFree: false,
      ownerUserId: ADMIN_ID,
    });
    await updateAdminCourse(id, { isFree: true });
    const row = await getRow(id);
    expect(row.isFree).toBe(true);
    expect(Number(row.price)).toBe(0);
  });
});
