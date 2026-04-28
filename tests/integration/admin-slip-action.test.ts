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

import {
  acceptSlip,
  rejectSlip,
  bulkAcceptSlips,
  bulkRejectSlips,
} from "@/server/actions/admin-slip";

async function reset() {
  await db.execute(sql`
    TRUNCATE audit_log, email_message, enrollment, payment_slip,
      pending_enrollment, media_asset, course, "user" CASCADE
  `);
}

async function seedSubmittedSlip(opts?: {
  refCode?: string;
  idemKey?: string;
  studentId?: string;
}): Promise<{ slipId: string; courseId: string; pendingId: string; studentId: string }> {
  const studentId = opts?.studentId ?? STUDENT_ID;
  // Idempotent admin/student insert so callers can seed many slips in a row.
  await db
    .insert(userTable)
    .values([
      { id: ADMIN_ID, email: "admin@finalive.dev", name: "Admin", role: "admin" },
      { id: studentId, email: `${studentId}@x.test`, name: "Stu", role: "user" },
    ])
    .onConflictDoNothing({ target: userTable.id });
  const existing = await db
    .select({ id: course.id })
    .from(course)
    .where(eq(course.slug, "c1"))
    .limit(1);
  const c =
    existing[0] ??
    (
      await db
        .insert(course)
        .values({
          slug: "c1",
          title: "Course One",
          summary: "S",
          ownerUserId: ADMIN_ID,
          price: "199.00",
          createdByUserId: ADMIN_ID,
        })
        .returning({ id: course.id })
    )[0];
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
      userId: studentId,
      courseId: c!.id,
      amount: "199.00",
      refCode: opts?.refCode ?? "FL-12345678",
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
      idempotencyKey: opts?.idemKey ?? "k1",
    })
    .returning({ id: paymentSlip.id });
  return { slipId: s!.id, courseId: c!.id, pendingId: p!.id, studentId };
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

  it("rejectSlip flips slip to rejected, bounces pending to awaiting_payment, audits", async () => {
    const { slipId, pendingId } = await seedSubmittedSlip();
    const result = await rejectSlip({ slipId, reason: "blurry", note: "ภาพเบลอ" });
    expect(result.pendingId).toBe(pendingId);

    const [s] = await db.select().from(paymentSlip).where(eq(paymentSlip.id, slipId));
    expect(s?.status).toBe("rejected");
    expect(s?.rejectionReason).toBe("blurry");
    expect(s?.rejectionNote).toBe("ภาพเบลอ");

    const [p] = await db
      .select()
      .from(pendingEnrollment)
      .where(eq(pendingEnrollment.id, pendingId));
    expect(p?.status).toBe("awaiting_payment");

    const enrolls = await db.select().from(enrollment);
    expect(enrolls.length).toBe(0);

    const emails = await db.select().from(emailMessage);
    expect(emails.find((e) => e.template === "slip_rejected")).toBeTruthy();

    const audits = await db.select().from(auditLog);
    expect(audits.find((a) => a.action === "payment_slip.rejected")).toBeTruthy();
  });

  it("rejectSlip refuses already-reviewed slip", async () => {
    const { slipId } = await seedSubmittedSlip();
    await rejectSlip({ slipId, reason: "other" });
    await expect(rejectSlip({ slipId, reason: "other" })).rejects.toMatchObject({
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

describe("bulkAcceptSlips / bulkRejectSlips", () => {
  beforeEach(reset);

  it("bulkAcceptSlips accepts all when each slip is for a different student", async () => {
    const a = await seedSubmittedSlip({
      refCode: "FL-A0000001",
      idemKey: "ka",
      studentId: randomUUID(),
    });
    const b = await seedSubmittedSlip({
      refCode: "FL-B0000001",
      idemKey: "kb",
      studentId: randomUUID(),
    });

    const result = await bulkAcceptSlips([a.slipId, b.slipId]);
    expect(result.succeeded.sort()).toEqual([a.slipId, b.slipId].sort());
    expect(result.failed).toEqual([]);

    const enrolls = await db.select().from(enrollment);
    expect(enrolls.length).toBe(2);
  });

  it("bulkAcceptSlips reports per-slip failures without aborting the batch", async () => {
    const a = await seedSubmittedSlip({
      refCode: "FL-A0000002",
      idemKey: "ka2",
      studentId: randomUUID(),
    });
    const b = await seedSubmittedSlip({
      refCode: "FL-B0000002",
      idemKey: "kb2",
      studentId: randomUUID(),
    });
    // Pre-accept slip a so the bulk call hits slip_already_reviewed for it.
    await acceptSlip(a.slipId);

    const result = await bulkAcceptSlips([a.slipId, b.slipId]);
    expect(result.succeeded).toEqual([b.slipId]);
    expect(result.failed.length).toBe(1);
    expect(result.failed[0]?.slipId).toBe(a.slipId);
    expect(result.failed[0]?.code).toBe("slip_already_reviewed");
  });

  it("bulkRejectSlips rejects all with the same reason", async () => {
    const a = await seedSubmittedSlip({
      refCode: "FL-A0000003",
      idemKey: "ka3",
      studentId: randomUUID(),
    });
    const b = await seedSubmittedSlip({
      refCode: "FL-B0000003",
      idemKey: "kb3",
      studentId: randomUUID(),
    });

    const result = await bulkRejectSlips([a.slipId, b.slipId], "stale_slip");
    expect(result.succeeded.length).toBe(2);
    expect(result.failed).toEqual([]);

    const slips = await db.select().from(paymentSlip);
    for (const s of slips) {
      expect(s.status).toBe("rejected");
      expect(s.rejectionReason).toBe("stale_slip");
    }
  });

  it("bulkAcceptSlips refuses oversized batches", async () => {
    const ids = Array.from({ length: 51 }, () => randomUUID());
    await expect(bulkAcceptSlips(ids)).rejects.toMatchObject({
      code: "validation_failed",
    });
  });
});
