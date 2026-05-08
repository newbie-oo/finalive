import "server-only";
import { ApiError } from "@/lib/api-error";
import { isUniqueViolation } from "@/lib/pg-error";
import {
	REJECT_REASON_LABEL,
	type RejectReason,
} from "@/components/admin/slip-reject-options";
import type { SlipNotifier } from "@/server/services/slip-notifier";
import type { AuditLogger } from "@/server/services/audit";
import {
	EnrollmentAlreadyActiveError,
	SlipAlreadyReviewedError,
} from "./repo-errors";
import type { SlipRepoShape, SlipReviewRow } from "./slip-repo";

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

export interface BulkResult {
	succeeded: string[];
	failed: Array<{ slipId: string; code: string; message: string }>;
}

export interface SlipReviewServiceDeps {
	repo: SlipRepoShape;
	notifier: SlipNotifier;
	auditLogger: AuditLogger;
}

const MAX_BULK = 50;
const BULK_CONCURRENCY = 5;

export class SlipReviewService {
	constructor(private deps: SlipReviewServiceDeps) {}

	async accept(slipId: string, adminUserId: string): Promise<AcceptSlipResult> {
		const row = await this.loadSlipForReview(slipId);
		let enrollmentId: string;
		try {
			const result = await this.deps.repo.runAcceptTx(
				slipId,
				row.pendingId,
				row,
				adminUserId,
			);
			enrollmentId = result.enrollmentId;
		} catch (e) {
			if (e instanceof SlipAlreadyReviewedError) {
				throw new ApiError("slip_already_reviewed", e.message);
			}
			if (e instanceof EnrollmentAlreadyActiveError) {
				throw new ApiError("enrollment_already_active", e.message);
			}
			// Unknown unique violation that escaped the constraint-name guard
			// inside the repo (e.g. a future constraint we haven't named yet).
			if (isUniqueViolation(e)) {
				throw new ApiError("conflict", "นักเรียนมีสิทธิ์เรียนคอร์สนี้อยู่แล้ว");
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
					enrollmentId,
					pendingId: row.pendingId,
					refCode: row.pendingRefCode,
				},
			},
			undefined,
		);

		return { slipId, enrollmentId };
	}

	async reject(
		input: RejectSlipInput,
		adminUserId: string,
	): Promise<RejectSlipResult> {
		const row = await this.loadSlipForReview(input.slipId);
		try {
			await this.deps.repo.runRejectTx(
				input.slipId,
				row.pendingId,
				input.reason,
				input.note,
				adminUserId,
			);
		} catch (e) {
			if (e instanceof SlipAlreadyReviewedError) {
				throw new ApiError("slip_already_reviewed", e.message);
			}
			throw e;
		}

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
			undefined,
		);

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
		const row = await this.deps.repo.loadForReview(slipId);
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
