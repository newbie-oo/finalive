import "server-only";
import { requireRole } from "@/server/auth-session";
import { container } from "@/server/container";
import {
	REJECT_REASONS,
	REJECT_REASON_LABEL,
	type RejectReason,
} from "@/components/admin/slip-reject-options";
import type {
	RejectSlipInput,
	RejectSlipResult,
	AcceptSlipResult,
	BulkResult,
} from "@/server/payments/slip-review-service";

export { REJECT_REASONS, REJECT_REASON_LABEL };
export type {
	RejectReason,
	RejectSlipInput,
	RejectSlipResult,
	AcceptSlipResult,
	BulkResult,
};

export async function acceptSlip(slipId: string): Promise<AcceptSlipResult> {
	const { user: admin } = await requireRole("admin");
	return container.slipReview().accept(slipId, admin.id);
}

export async function rejectSlip(
	input: RejectSlipInput,
): Promise<RejectSlipResult> {
	const { user: admin } = await requireRole("admin");
	return container.slipReview().reject(input, admin.id);
}

export function bulkAcceptSlips(slipIds: string[]): Promise<BulkResult> {
	return requireRole("admin").then(({ user: admin }) =>
		container.slipReview().bulkAccept(slipIds, admin.id),
	);
}

export function bulkRejectSlips(
	slipIds: string[],
	reason: RejectReason,
	note?: string,
): Promise<BulkResult> {
	return requireRole("admin").then(({ user: admin }) =>
		container.slipReview().bulkReject(slipIds, reason, note, admin.id),
	);
}
