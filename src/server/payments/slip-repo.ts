import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
	paymentSlip,
	pendingEnrollment,
	type PendingStatus,
} from "@/db/schema/payment";
import { course } from "@/db/schema/course";
import { enrollment } from "@/db/schema/enrollment";
import { user as userTable } from "@/db/schema/auth";
import { mediaAsset } from "@/db/schema/media";
import { isUniqueViolation } from "@/lib/pg-error";
import {
	EnrollmentAlreadyActiveError,
	RepoIntegrityError,
	SlipAlreadyReviewedError,
} from "./repo-errors";
import type { RejectReason } from "@/components/admin/slip-reject-options";

export interface SlipReviewRow {
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

export interface PendingRow {
	id: string;
	userId: string;
	courseId: string;
	amount: string;
	status: PendingStatus;
	expiresAt: Date;
	refCode: string;
}

export interface CourseInfo {
	title: string;
	slug: string;
}

export interface AcceptTxResult {
	enrollmentId: string;
}

export interface RejectTxResult {
	pendingId: string;
}

/** Thin data-access module for slip operations. No business rules. */
export const SlipRepo = {
	async loadForReview(slipId: string): Promise<SlipReviewRow | null> {
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
		return rows[0] ?? null;
	},

	async countSlipsForPending(pendingId: string): Promise<number> {
		const rows = await db
			.select({ total: sql<number>`count(*)::int` })
			.from(paymentSlip)
			.where(eq(paymentSlip.pendingEnrollmentId, pendingId));
		return rows[0]?.total ?? 0;
	},

	async loadPending(pendingId: string): Promise<PendingRow | null> {
		const rows = await db
			.select({
				id: pendingEnrollment.id,
				userId: pendingEnrollment.userId,
				courseId: pendingEnrollment.courseId,
				amount: pendingEnrollment.amount,
				status: pendingEnrollment.status,
				expiresAt: pendingEnrollment.expiresAt,
				refCode: pendingEnrollment.refCode,
			})
			.from(pendingEnrollment)
			.where(eq(pendingEnrollment.id, pendingId))
			.limit(1);
		const row = rows[0];
		if (!row) return null;
		return { ...row, status: row.status as PendingStatus };
	},

	async loadCourseInfo(courseId: string): Promise<CourseInfo | null> {
		const rows = await db
			.select({ title: course.title, slug: course.slug })
			.from(course)
			.where(eq(course.id, courseId))
			.limit(1);
		return rows[0] ?? null;
	},

	async runAcceptTx(
		slipId: string,
		pendingId: string,
		row: SlipReviewRow,
		adminUserId: string,
	): Promise<AcceptTxResult> {
		return db.transaction(async (tx) => {
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
				throw new SlipAlreadyReviewedError();
			}

			await tx
				.update(pendingEnrollment)
				.set({ status: "paid", updatedAt: new Date() })
				.where(eq(pendingEnrollment.id, pendingId));

			let enrollmentId: string;
			try {
				const inserted = await tx
					.insert(enrollment)
					.values({
						userId: row.studentUserId,
						courseId: row.courseId,
						source: "paid",
						sourcePendingId: pendingId,
						priceAtPurchase: row.pendingAmount,
						status: "active",
					})
					.returning({ id: enrollment.id });
				const created = inserted[0];
				if (!created)
					throw new RepoIntegrityError("enrollment insert failed");
				enrollmentId = created.id;
			} catch (e) {
				if (isUniqueViolation(e, "one_active_enrollment")) {
					throw new EnrollmentAlreadyActiveError();
				}
				throw e;
			}

			return { enrollmentId };
		});
	},

	async runRejectTx(
		slipId: string,
		pendingId: string,
		reason: RejectReason,
		note: string | undefined,
		adminUserId: string,
	): Promise<RejectTxResult> {
		return db.transaction(async (tx) => {
			const updated = await tx
				.update(paymentSlip)
				.set({
					status: "rejected",
					rejectionReason: reason,
					rejectionNote: note ?? null,
					reviewedByUserId: adminUserId,
					reviewedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(
					and(eq(paymentSlip.id, slipId), eq(paymentSlip.status, "submitted")),
				)
				.returning({ id: paymentSlip.id });

			if (updated.length === 0) {
				throw new SlipAlreadyReviewedError();
			}

			await tx
				.update(pendingEnrollment)
				.set({ status: "awaiting_payment", updatedAt: new Date() })
				.where(eq(pendingEnrollment.id, pendingId));

			return { pendingId };
		});
	},

	async reserveMediaAsset(input: {
		kind: string;
		storageKey: string;
		mimeType: string;
		sizeBytes: number;
		userId: string;
	}): Promise<string> {
		const [media] = await db
			.insert(mediaAsset)
			.values({
				kind: input.kind as "image" | "pdf",
				storage: "r2_private",
				storageKey: input.storageKey,
				mimeType: input.mimeType,
				sizeBytes: input.sizeBytes,
				status: "pending_upload",
				createdByUserId: input.userId,
			})
			.returning({ id: mediaAsset.id });
		if (!media) throw new RepoIntegrityError("media insert failed");
		return media.id;
	},

	async getSlipImageMedia(
		slipId: string,
	): Promise<
		{ storageKey: string; storage: string; mimeType: string | null } | undefined
	> {
		const rows = await db
			.select({
				storageKey: mediaAsset.storageKey,
				storage: mediaAsset.storage,
				mimeType: mediaAsset.mimeType,
			})
			.from(paymentSlip)
			.innerJoin(mediaAsset, eq(paymentSlip.imageMediaId, mediaAsset.id))
			.where(eq(paymentSlip.id, slipId))
			.limit(1);
		return rows[0];
	},

	async finalizeUploadTx(input: {
		mediaId: string;
		pendingId: string;
		userId: string;
		idempotencyKey: string;
		expectedAmount: string;
		reportedAmount: string | null;
	}): Promise<string> {
		return db.transaction(async (tx) => {
			await tx
				.update(mediaAsset)
				.set({ status: "ready" })
				.where(eq(mediaAsset.id, input.mediaId));

			const [slip] = await tx
				.insert(paymentSlip)
				.values({
					pendingEnrollmentId: input.pendingId,
					imageMediaId: input.mediaId,
					expectedAmount: input.expectedAmount,
					reportedAmount: input.reportedAmount,
					status: "submitted",
					idempotencyKey: input.idempotencyKey,
				})
				.returning({ id: paymentSlip.id });
			if (!slip) throw new RepoIntegrityError("slip insert failed");

			await tx
				.update(pendingEnrollment)
				.set({ status: "slip_submitted", updatedAt: new Date() })
				.where(
					and(
						eq(pendingEnrollment.id, input.pendingId),
						eq(pendingEnrollment.userId, input.userId),
					),
				);

			return slip.id;
		});
	},
};

/**
 * Full shape of the concrete SlipRepo. Avoid passing this around as a
 * dependency — services should depend on the narrower role-specific
 * interfaces below so the unused surface doesn't have to be mocked out
 * in tests.
 */
export type SlipRepoShape = typeof SlipRepo;

/** Methods the slip-review service actually uses. */
export interface SlipReviewRepo {
	loadForReview: SlipRepoShape["loadForReview"];
	runAcceptTx: SlipRepoShape["runAcceptTx"];
	runRejectTx: SlipRepoShape["runRejectTx"];
}

/** Methods the slip-upload service actually uses. */
export interface SlipUploadRepo {
	countSlipsForPending: SlipRepoShape["countSlipsForPending"];
	loadPending: SlipRepoShape["loadPending"];
	loadCourseInfo: SlipRepoShape["loadCourseInfo"];
	reserveMediaAsset: SlipRepoShape["reserveMediaAsset"];
	finalizeUploadTx: SlipRepoShape["finalizeUploadTx"];
}
