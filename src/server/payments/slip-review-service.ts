import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { paymentSlip, pendingEnrollment } from "@/db/schema/payment";
import { course } from "@/db/schema/course";
import { enrollment } from "@/db/schema/enrollment";
import { user as userTable } from "@/db/schema/auth";
import { ApiError } from "@/lib/api-error";
import { isUniqueViolation } from "@/lib/pg-error";
import {
	REJECT_REASON_LABEL,
	type RejectReason,
} from "@/components/admin/slip-reject-options";
import type { SlipNotifier } from "@/server/services/slip-notifier";
import type { AuditLogger } from "@/server/services/audit-logger";

export interface RejectSlipInput {
	slipId: string;
	reason: RejectReason;
	note?: string;
}

export interface RejectSlipResult {
	slipId: string;
	pendingId: string;
}

export interface AcceptSlipResult {
	slipId: string;
	enrollmentId: string;
}

interface SlipReviewRow {
	slipId: string;
	pendingId: string;
	pendingAmount: string;
	pendingRefCode: string;
	studentUserId: string;
	studentEmail: string;
	studentName: string | null;
	courseId: string;
	courseTitle: string;
	courseSlug: string;
}

export interface SlipReviewServiceDeps {
	notifier: SlipNotifier;
	auditLogger: AuditLogger;
}

const MAX_BULK = 50;
const BULK_CONCURRENCY = 5;

export interface BulkResult {
	succeeded: string[];
	failed: Array<{ slipId: string; code: string; message: string }>;
}

export class SlipReviewService {
	constructor(private deps: SlipReviewServiceDeps) {}

	async accept(slipId: string, adminUserId: string): Promise<AcceptSlipResult> {
		const row = await this.loadSlipForReview(slipId);

		const enrollmentId = await db.transaction(async (tx) => {
			const updated = await tx
				.update(paymentSlip)
				.set({
					status: "accepted",
					reviewedByUserId: adminUserId,
					reviewedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(
					and(eq(paymentSlip.id, slipId), eq(paymentSlip.status, "submitted")),
				)
				.returning({ id: paymentSlip.id });
			if (updated.length === 0) {
				throw new ApiError(
					"slip_already_reviewed",
					"slip was reviewed by another admin",
				);
			}

			await tx
				.update(pendingEnrollment)
				.set({ status: "paid", updatedAt: new Date() })
				.where(eq(pendingEnrollment.id, row.pendingId));

			let createdEnrollmentId: string;
			try {
				const inserted = await tx
					.insert(enrollment)
					.values({
						userId: row.studentUserId,
						courseId: row.courseId,
						source: "paid",
						sourcePendingId: row.pendingId,
						priceAtPurchase: row.pendingAmount,
						status: "active",
					})
					.returning({ id: enrollment.id });
				const created = inserted[0];
				if (!created)
					throw new ApiError("internal_error", "enrollment insert failed");
				createdEnrollmentId = created.id;
			} catch (e) {
				if (isUniqueViolation(e, "one_active_enrollment")) {
					throw new ApiError(
						"enrollment_already_active",
						"นักเรียนมีสิทธิ์เรียนคอร์สนี้อยู่แล้ว",
					);
				}
				throw e;
			}

			await this.deps.notifier.notifyStudentOfSlipAcceptance({
				toEmail: row.studentEmail,
				studentName: row.studentName ?? row.studentEmail,
				courseTitle: row.courseTitle,
				courseSlug: row.courseSlug,
				refCode: row.pendingRefCode,
				amount: Number(row.pendingAmount),
				userId: row.studentUserId,
			});

			await this.deps.auditLogger.log(
				{
					actorType: "user",
					actorUserId: adminUserId,
					action: "payment_slip.accepted",
					targetType: "payment_slip",
					targetId: slipId,
					afterJson: {
						enrollmentId: createdEnrollmentId,
						pendingId: row.pendingId,
						refCode: row.pendingRefCode,
					},
				},
				tx,
			);

			return createdEnrollmentId;
		});

		return { slipId, enrollmentId };
	}

	async reject(
		input: RejectSlipInput,
		adminUserId: string,
	): Promise<RejectSlipResult> {
		const row = await this.loadSlipForReview(input.slipId);

		await db.transaction(async (tx) => {
			const updated = await tx
				.update(paymentSlip)
				.set({
					status: "rejected",
					rejectionReason: input.reason,
					rejectionNote: input.note ?? null,
					reviewedByUserId: adminUserId,
					reviewedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(
					and(
						eq(paymentSlip.id, input.slipId),
						eq(paymentSlip.status, "submitted"),
					),
				)
				.returning({ id: paymentSlip.id });
			if (updated.length === 0) {
				throw new ApiError(
					"slip_already_reviewed",
					"slip was reviewed by another admin",
				);
			}

			await tx
				.update(pendingEnrollment)
				.set({ status: "awaiting_payment", updatedAt: new Date() })
				.where(eq(pendingEnrollment.id, row.pendingId));

			await this.deps.notifier.notifyStudentOfSlipRejection({
				toEmail: row.studentEmail,
				studentName: row.studentName ?? row.studentEmail,
				courseTitle: row.courseTitle,
				courseSlug: row.courseSlug,
				refCode: row.pendingRefCode,
				amount: Number(row.pendingAmount),
				reasonLabel: REJECT_REASON_LABEL[input.reason],
				note: input.note ?? null,
				userId: row.studentUserId,
			});

			await this.deps.auditLogger.log(
				{
					actorType: "user",
					actorUserId: adminUserId,
					action: "payment_slip.rejected",
					targetType: "payment_slip",
					targetId: input.slipId,
					afterJson: {
						pendingId: row.pendingId,
						refCode: row.pendingRefCode,
						reason: input.reason,
						note: input.note ?? null,
					},
				},
				tx,
			);
		});

		return { slipId: input.slipId, pendingId: row.pendingId };
	}

	async bulkAccept(
		slipIds: string[],
		adminUserId: string,
	): Promise<BulkResult> {
		return this.runBulk(slipIds, (id) => this.accept(id, adminUserId));
	}

	async bulkReject(
		slipIds: string[],
		reason: RejectReason,
		note: string | undefined,
		adminUserId: string,
	): Promise<BulkResult> {
		return this.runBulk(slipIds, (id) =>
			this.reject({ slipId: id, reason, note }, adminUserId),
		);
	}

	private async loadSlipForReview(slipId: string): Promise<SlipReviewRow> {
		const rows = await db
			.select({
				slipId: paymentSlip.id,
				pendingId: pendingEnrollment.id,
				pendingAmount: pendingEnrollment.amount,
				pendingRefCode: pendingEnrollment.refCode,
				studentUserId: pendingEnrollment.userId,
				studentEmail: userTable.email,
				studentName: userTable.name,
				courseId: course.id,
				courseTitle: course.title,
				courseSlug: course.slug,
			})
			.from(paymentSlip)
			.innerJoin(
				pendingEnrollment,
				eq(paymentSlip.pendingEnrollmentId, pendingEnrollment.id),
			)
			.innerJoin(course, eq(pendingEnrollment.courseId, course.id))
			.innerJoin(userTable, eq(pendingEnrollment.userId, userTable.id))
			.where(eq(paymentSlip.id, slipId))
			.limit(1);

		const row = rows[0];
		if (!row) throw new ApiError("not_found", "slip not found");
		return row;
	}

	private async runBulk(
		slipIds: string[],
		fn: (id: string) => Promise<unknown>,
	): Promise<BulkResult> {
		if (slipIds.length === 0 || slipIds.length > MAX_BULK) {
			throw new ApiError(
				"validation_failed",
				`bulk size must be 1..${MAX_BULK}`,
			);
		}

		const result: BulkResult = { succeeded: [], failed: [] };
		for (let i = 0; i < slipIds.length; i += BULK_CONCURRENCY) {
			const chunk = slipIds.slice(i, i + BULK_CONCURRENCY);
			const settled = await Promise.allSettled(chunk.map((id) => fn(id)));
			settled.forEach((s, idx) => {
				const id = chunk[idx]!;
				if (s.status === "fulfilled") result.succeeded.push(id);
				else result.failed.push(this.describeBulkError(id, s.reason));
			});
		}
		return result;
	}

	private describeBulkError(
		id: string,
		e: unknown,
	): BulkResult["failed"][number] {
		if (e instanceof ApiError)
			return { slipId: id, code: e.code, message: e.message };
		return {
			slipId: id,
			code: "internal_error",
			message: e instanceof Error ? e.message : String(e),
		};
	}
}
