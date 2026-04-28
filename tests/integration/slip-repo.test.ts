import { describe, it, expect, beforeAll, beforeEach } from "vitest";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { course } from "@/db/schema/course";
import { mediaAsset } from "@/db/schema/media";
import { pendingEnrollment, paymentSlip } from "@/db/schema/payment";
import { listPendingSlips, countPendingSlipsByStatus } from "@/server/repos/slip";

async function reset() {
  await db.execute(sql`TRUNCATE payment_slip, pending_enrollment, media_asset, course CASCADE`);
}

async function seed(opts: { count: number }) {
  const [c] = await db
    .insert(course)
    .values({
      slug: "test-course",
      title: "Test",
      summary: "S",
      ownerUserId: "owner",
      createdByUserId: "owner",
    })
    .returning({ id: course.id });
  if (!c) throw new Error("course insert failed");

  for (let i = 0; i < opts.count; i++) {
    const [m] = await db
      .insert(mediaAsset)
      .values({
        kind: "image",
        storage: "r2_private",
        storageKey: `k${i}`,
        mimeType: "image/png",
        sizeBytes: 100,
        status: "ready",
        createdByUserId: "u1",
      })
      .returning({ id: mediaAsset.id });
    const [p] = await db
      .insert(pendingEnrollment)
      .values({
        userId: `u${i}`,
        courseId: c.id,
        amount: "100.00",
        refCode: `FL-${i.toString().padStart(8, "0")}`,
        status: "slip_submitted",
        expiresAt: new Date(Date.now() + 86400_000),
      })
      .returning({ id: pendingEnrollment.id });
    await db.insert(paymentSlip).values({
      pendingEnrollmentId: p!.id,
      imageMediaId: m!.id,
      expectedAmount: "100.00",
      status: "submitted",
      idempotencyKey: `idem-${i}`,
    });
  }
}

describe("listPendingSlips", () => {
  beforeAll(reset);
  beforeEach(reset);

  it("returns submitted slips with course/pending join, newest first", async () => {
    await seed({ count: 3 });
    const res = await listPendingSlips({ per_page: 50 });
    expect(res.data.length).toBe(3);
    expect(res.data[0]?.courseSlug).toBe("test-course");
    expect(res.data[0]?.status).toBe("submitted");
    expect(res.pagination.has_next).toBe(false);
    expect(res.pagination.next_cursor).toBeNull();
  });

  it("paginates via cursor", async () => {
    await seed({ count: 5 });
    const page1 = await listPendingSlips({ per_page: 2 });
    expect(page1.data.length).toBe(2);
    expect(page1.pagination.has_next).toBe(true);
    expect(page1.pagination.next_cursor).not.toBeNull();

    const page2 = await listPendingSlips({
      per_page: 2,
      cursor: page1.pagination.next_cursor!,
    });
    expect(page2.data.length).toBe(2);
    const ids1 = new Set(page1.data.map((r) => r.id));
    for (const r of page2.data) expect(ids1.has(r.id)).toBe(false);
  });

  it("filters by status", async () => {
    await seed({ count: 2 });
    const submitted = await listPendingSlips({ per_page: 50, status: "submitted" });
    expect(submitted.data.length).toBe(2);
    const accepted = await listPendingSlips({ per_page: 50, status: "accepted" });
    expect(accepted.data.length).toBe(0);
  });

  it("countPendingSlipsByStatus returns counts", async () => {
    await seed({ count: 3 });
    const counts = await countPendingSlipsByStatus();
    expect(counts.submitted).toBe(3);
    expect(counts.accepted).toBe(0);
    expect(counts.rejected).toBe(0);
  });
});
