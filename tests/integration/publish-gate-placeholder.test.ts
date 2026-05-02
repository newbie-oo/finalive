import { describe, it, expect, beforeAll } from "vitest";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { course, courseModule, lesson } from "@/db/schema/course";
import { user } from "@/db/schema/auth";
import { vi } from "vitest";
import * as authSession from "@/server/auth-session";

const ADMIN_ID = randomUUID();

const PLACEHOLDER_BODY = `# Lesson Title
> Course → Module
## สิ่งที่จะได้เรียน
- ภาพรวมของหัวข้อ และวิธีนำไปใช้จริง
- เครื่องมือที่ต้องเตรียม และคำแนะนำการเซ็ตอัป
- ตัวอย่างพร้อมโค้ด/แบบฝึกหัดท้ายบท`;

const REAL_BODY = `# IRR คืออะไร

IRR (Internal Rate of Return) คืออัตราคิดลดที่ทำให้ NPV ของกระแส
เงินสดเท่ากับศูนย์ ใช้สำหรับเปรียบเทียบความน่าสนใจระหว่างการลงทุน
หลายโปรเจกต์ที่มีระยะเวลาต่างกัน หากใช้ Excel เรียกว่า =IRR(values)
และต้องระบุ guess ในกรณีที่กระแสเงินสดมีหลายเครื่องหมาย`;

beforeAll(async () => {
  await db.execute(sql`TRUNCATE TABLE "lesson", "module", "course", "user" CASCADE`);
  await db
    .insert(user)
    .values({ id: ADMIN_ID, email: "publish@y.test", name: "X", role: "admin" });

  vi.spyOn(authSession, "getSession").mockResolvedValue({
    user: { id: ADMIN_ID, role: "admin", email: "publish@y.test", name: "X" },
    session: { id: "s", userId: ADMIN_ID, expiresAt: new Date(Date.now() + 1_000_000), token: "t", createdAt: new Date(), updatedAt: new Date(), ipAddress: null, userAgent: null },
  } as unknown as Awaited<ReturnType<typeof authSession.getSession>>);
});

async function seedCourse(slug: string, body: string) {
  const courseId = randomUUID();
  const moduleId = randomUUID();
  await db.insert(course).values({
    id: courseId,
    slug,
    title: "T",
    summary: "x",
    ownerUserId: ADMIN_ID,
    price: "0.00",
    isFree: true,
    status: "draft",
    createdByUserId: ADMIN_ID,
  });
  await db.insert(courseModule).values({
    id: moduleId,
    courseId,
    title: "M1",
    sortOrder: 1,
    createdByUserId: ADMIN_ID,
  });
  await db.insert(lesson).values({
    moduleId,
    title: "L1",
    sortOrder: 1,
    bodyMd: body,
    createdByUserId: ADMIN_ID,
  });
  return courseId;
}

describe("publishCourseAction blocks placeholder lesson bodies", () => {
  it("blocks publish when any lesson body matches the seed placeholder template", async () => {
    const { publishCourseAction } = await import("@/server/actions/admin-publish");
    const courseId = await seedCourse(`pub-${randomUUID()}`, PLACEHOLDER_BODY);
    const fd = new FormData();
    fd.append("courseId", courseId);
    const res = await publishCourseAction(fd);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe("validation_failed");
      expect(res.errors?.some((e) => e.includes("เนื้อหา") || e.includes("placeholder"))).toBe(true);
    }
  });

  it("blocks publish when a lesson body is empty", async () => {
    const { publishCourseAction } = await import("@/server/actions/admin-publish");
    const courseId = await seedCourse(`pub-${randomUUID()}`, "");
    const fd = new FormData();
    fd.append("courseId", courseId);
    const res = await publishCourseAction(fd);
    expect(res.ok).toBe(false);
  });

  it("allows publish when all lessons have real content", async () => {
    const { publishCourseAction } = await import("@/server/actions/admin-publish");
    const courseId = await seedCourse(`pub-${randomUUID()}`, REAL_BODY);
    const fd = new FormData();
    fd.append("courseId", courseId);
    const res = await publishCourseAction(fd);
    expect(res.ok).toBe(true);
  });
});
