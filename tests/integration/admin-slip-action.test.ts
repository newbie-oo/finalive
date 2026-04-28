import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { sql, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { course } from "@/db/schema/course";
import { mediaAsset } from "@/db/schema/media";
import { user as userTable } from "@/db/schema/auth";
import { pendingEnrollment, paymentSlip } from "@/db/schema/payment";
import { enrollment } from "@/db/schema/enrollment";
import { emailMessage, auditLog } from "@/db/schema/audit";

const ADMIN_ID = randomUUID();
const STUDENT_ID = randomUUID();

vi.mock("@/server/auth-session", () => ({
  requireRole: vi.fn(async () => ({
    sessionId: "s1",
    user: {
      id: ADMIN_ID,
      email: "admin@finalive.dev",
      name: "Admin",
      role: "admin" as const,
      emailVerified: true,
    },
  })),
}));

import { acceptSlip } from "@/server/actions/admin-slip";

async function reset() {
  await db.execute(sql`
    TRUNCATE audit_log, email_message, enrollment, payment_slip,
      pending_enrollment, media_asset, course, "user" CASCADE
  `);
}

async function seedSubmittedSlip(): Promise<{ slipId: string; courseId: string; pendingId: string }> {
  await db.insert(userTable).values([
    { id: ADMIN_ID, email: "admin@finalive.dev", name: "Admin", role: "admin" },
    { id: STUDENT_ID, email: "stu@x.test", name: "Stu", role: "user" },
  ]);
  const [c] = await db
    .insert(course)
    .values({
      slug: "c1",
      title: "Course One",
      summary: "S",
      ownerUserId: ADMIN_ID,
      price: "199.00",
      createdByUserId: ADMIN_ID,
    })
    .returning({ id: course.id });
  const [m] = await db
    .insert(mediaAsset)
    .values({
      kind: "image",
      storage: "r2_private",
      storageKey: "slips/x.png",
      mimeType: "image/png",
      sizeBytes: 100,
      status: "ready",
      createdByUserId: STUDENT_ID,
    })
    .returning({ id: mediaAsset.id });
  const [p] = await db
    .insert(pendingEnrollment)
    .values({
      userId: STUDENT_ID,
      courseId: c!.id,
      amount: "199.00",
      refCode: "FL-12345678",
      status: "slip_submitted",
      expiresAt: new Date(Date.now() + 86400_000),
    })
    .returning({ id: pendingEnrollment.id });
  const [s] = await db
    .insert(paymentSlip)
    .values({
      pendingEnrollmentId: p!.id,
      imageMediaId: m!.id,
      expectedAmount: "199.00",
      status: "submitted",
      idempotencyKey: "k1",
    })
    .returning({ id: paymentSlip.id });
  return { slipId: s!.id, courseId: c!.id, pendingId: p!.id };
}

describe("acceptSlip", () => {
  beforeAll(reset);
  beforeEach(reset);

  it("accepts slip + creates enrollment + flips pending + queues email + audits", async () => {
    const { slipId, courseId, pendingId } = await seedSubmittedSlip();
    const result = await acceptSlip(slipId);

    expect(result.slipId).toBe(slipId);
    expect(result.enrollmentId).toBeTruthy();

    const [s] = await db.select().from(paymentSlip).where(eq(paymentSlip.id, slipId));
    expect(s?.status).toBe("accepted");
    expect(s?.reviewedByUserId).toBe(ADMIN_ID);

    const [p] = await db
      .select()
      .from(pendingEnrollment)
      .where(eq(pendingEnrollment.id, pendingId));
    expect(p?.status).toBe("paid");

    const enrolls = await db
      .select()
      .from(enrollment)
      .where(eq(enrollment.userId, STUDENT_ID));
    expect(enrolls.length).toBe(1);
    expect(enrolls[0]?.courseId).toBe(courseId);
    expect(enrolls[0]?.source).toBe("paid");
    expect(enrolls[0]?.sourcePendingId).toBe(pendingId);

    const emails = await db.select().from(emailMessage);
    expect(emails.find((e) => e.template === "slip_accepted")).toBeTruthy();

    const audits = await db.select().from(auditLog);
    expect(audits.find((a) => a.action === "payment_slip.accepted")).toBeTruthy();
  });

  it("rejects double-accept with slip_already_reviewed", async () => {
    const { slipId } = await seedSubmittedSlip();
    await acceptSlip(slipId);
    await expect(acceptSlip(slipId)).rejects.toMatchObject({
      code: "slip_already_reviewed",
    });
  });

  it("returns enrollment_already_active when same (user,course) already enrolled", async () => {
    const { slipId, courseId } = await seedSubmittedSlip();
    // Pre-existing active enrollment via free_course path
    await db.insert(enrollment).values({
      userId: STUDENT_ID,
      courseId,
      source: "free_course",
      status: "active",
    });
    await expect(acceptSlip(slipId)).rejects.toMatchObject({
      code: "enrollment_already_active",
    });
  });
});
