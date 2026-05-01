import "server-only";
import { requireRole } from "@/server/auth-session";
import { SlipReviewService } from "@/server/payments/slip-review-service";
import { EmailSlipNotifier } from "@/server/services/slip-notifier";
import { DbAuditLogger } from "@/server/services/audit-logger";
import {
	REJECT_REASONS,
	REJECT_REASON_LABEL,
	type RejectReason,
} from "@/components/admin/slip-reject-options";

export { REJECT_REASONS, REJECT_REASON_LABEL };
export type { RejectReason };

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

function makeService() {
	return new SlipReviewService({
		notifier: new EmailSlipNotifier(),
		auditLogger: new DbAuditLogger(),
	});
}

export async function acceptSlip(slipId: string): Promise<AcceptSlipResult> {
	const { user: admin } = await requireRole("admin");
	return makeService().accept(slipId, admin.id);
}

export async function rejectSlip(
	input: RejectSlipInput,
): Promise<RejectSlipResult> {
	const { user: admin } = await requireRole("admin");
	return makeService().reject(input, admin.id);
}

export function bulkAcceptSlips(slipIds: string[]): Promise<BulkResult> {
	return requireRole("admin").then(({ user: admin }) =>
		makeService().bulkAccept(slipIds, admin.id),
	);
}

export function bulkRejectSlips(
	slipIds: string[],
	reason: RejectReason,
	note?: string,
): Promise<BulkResult> {
	return requireRole("admin").then(({ user: admin }) =>
		makeService().bulkReject(slipIds, reason, note, admin.id),
	);
}
