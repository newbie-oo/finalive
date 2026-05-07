import "server-only";
import { revalidatePath } from "next/cache";
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

function revalidateSlipPaths(): void {
	revalidatePath("/admin/slips");
	revalidatePath("/admin");
	revalidatePath("/dashboard");
	revalidatePath("/account/enrollments");
}

export async function acceptSlip(slipId: string): Promise<AcceptSlipResult> {
	const { user: admin } = await requireRole("admin");
	const result = await container.slipReview().accept(slipId, admin.id);
	revalidateSlipPaths();
	return result;
}

export async function rejectSlip(
	input: RejectSlipInput,
): Promise<RejectSlipResult> {
	const { user: admin } = await requireRole("admin");
	const result = await container.slipReview().reject(input, admin.id);
	revalidateSlipPaths();
	return result;
}

export async function bulkAcceptSlips(
	slipIds: string[],
): Promise<BulkResult> {
	const { user: admin } = await requireRole("admin");
	const result = await container.slipReview().bulkAccept(slipIds, admin.id);
	revalidateSlipPaths();
	return result;
}

export async function bulkRejectSlips(
	slipIds: string[],
	reason: RejectReason,
	note?: string,
): Promise<BulkResult> {
	const { user: admin } = await requireRole("admin");
	const result = await container
		.slipReview()
		.bulkReject(slipIds, reason, note, admin.id);
	revalidateSlipPaths();
	return result;
}
