import { describe, it, expect, beforeEach } from "vitest";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { course } from "@/db/schema/course";
import { mediaAsset } from "@/db/schema/media";
import { user as userTable } from "@/db/schema/auth";
import { pendingEnrollment, paymentSlip } from "@/db/schema/payment";
import { enrollment } from "@/db/schema/enrollment";
import { AdminStatsRepo } from "@/server/repos/admin-stats";

async function reset() {
	await db.execute(sql`
    TRUNCATE audit_log, email_message, enrollment, payment_slip,
      pending_enrollment, media_asset, course, "user" CASCADE
  `);
}

describe("getAdminDashboardCounts", () => {
	beforeEach(reset);

	it("counts submitted, today's reviews, active enrollments, and published courses", async () => {
		const adminId = randomUUID();
		await db.insert(userTable).values({
			id: adminId,
			email: "a@x.test",
			name: "A",
			role: "admin",
		});

		const [pub] = await db
			.insert(course)
			.values({
				slug: "pub",
				title: "Pub",
				summary: "S",
				ownerUserId: adminId,
				status: "published",
				createdByUserId: adminId,
			})
			.returning({ id: course.id });
		await db.insert(course).values({
			slug: "draft",
			title: "Draft",
			summary: "S",
			ownerUserId: adminId,
			status: "draft",
			createdByUserId: adminId,
		});

		const [m] = await db
			.insert(mediaAsset)
			.values({
				kind: "image",
				storage: "r2_private",
				storageKey: "k",
				mimeType: "image/png",
				sizeBytes: 1,
				status: "ready",
				createdByUserId: adminId,
			})
			.returning({ id: mediaAsset.id });

		// 2 submitted slips, 1 accepted today, 1 rejected today, 1 accepted yesterday.
		const yesterday = new Date(Date.now() - 36 * 3600 * 1000);
		const studentA = randomUUID();
		const studentB = randomUUID();
		const studentC = randomUUID();
		const studentD = randomUUID();
		const studentE = randomUUID();
		await db.insert(userTable).values([
			{ id: studentA, email: "a@s", name: "A", role: "user" },
			{ id: studentB, email: "b@s", name: "B", role: "user" },
			{ id: studentC, email: "c@s", name: "C", role: "user" },
			{ id: studentD, email: "d@s", name: "D", role: "user" },
			{ id: studentE, email: "e@s", name: "E", role: "user" },
		]);

		async function makeSlip(opts: {
			student: string;
			ref: string;
			idem: string;
			slipStatus: "submitted" | "accepted" | "rejected";
			reviewedAt?: Date;
			pendingStatus?: string;
		}) {
			const [p] = await db
				.insert(pendingEnrollment)
				.values({
					userId: opts.student,
					courseId: pub!.id,
					amount: "100.00",
					refCode: opts.ref,
					status: opts.pendingStatus ?? "slip_submitted",
					expiresAt: new Date(Date.now() + 86400_000),
				})
				.returning({ id: pendingEnrollment.id });
			await db.insert(paymentSlip).values({
				pendingEnrollmentId: p!.id,
				imageMediaId: m!.id,
				expectedAmount: "100.00",
				status: opts.slipStatus,
				reviewedAt: opts.reviewedAt ?? null,
				idempotencyKey: opts.idem,
			});
		}

		await makeSlip({
			student: studentA,
			ref: "FL-A0000001",
			idem: "ka",
			slipStatus: "submitted",
		});
		await makeSlip({
			student: studentB,
			ref: "FL-B0000001",
			idem: "kb",
			slipStatus: "submitted",
		});
		await makeSlip({
			student: studentC,
			ref: "FL-C0000001",
			idem: "kc",
			slipStatus: "accepted",
			reviewedAt: new Date(),
			pendingStatus: "paid",
		});
		await makeSlip({
			student: studentD,
			ref: "FL-D0000001",
			idem: "kd",
			slipStatus: "rejected",
			reviewedAt: new Date(),
			pendingStatus: "awaiting_payment",
		});
		await makeSlip({
			student: studentE,
			ref: "FL-E0000001",
			idem: "ke",
			slipStatus: "accepted",
			reviewedAt: yesterday,
			pendingStatus: "paid",
		});

		// 1 active enrollment
		await db.insert(enrollment).values({
			userId: studentC,
			courseId: pub!.id,
			source: "free_course",
			status: "active",
		});

		const counts = await AdminStatsRepo.getCounts();
		expect(counts.slipsSubmitted).toBe(2);
		expect(counts.slipsAcceptedToday).toBe(1);
		expect(counts.slipsRejectedToday).toBe(1);
		expect(counts.enrollmentsActive).toBe(1);
		expect(counts.coursesPublished).toBe(1);
	});

	it("returns zeros on empty db", async () => {
		const counts = await AdminStatsRepo.getCounts();
		expect(counts).toEqual({
			slipsSubmitted: 0,
			slipsAcceptedToday: 0,
			slipsRejectedToday: 0,
			enrollmentsActive: 0,
			coursesPublished: 0,
			revenueMtd: 0,
			certsMtd: 0,
		});
	});
});
