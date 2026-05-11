import "server-only";
import { notFound, redirect } from "next/navigation";
import type { CheckoutPending } from "@/server/repos/checkout";
import {
	getCheckoutPending,
	getLatestSlipForPending,
} from "@/server/repos/checkout";
import {
	getBankDisplay,
	getPromptPayQrImageUrl,
} from "@/server/repos/app-setting";
import { isSubmitted, type PendingStatus } from "@/server/services/pending-fsm";
import {
	REJECT_REASON_LABEL,
	type RejectReason,
} from "@/components/admin/slip-reject-options";

export interface RejectedSlipInfo {
	reasonLabel: string;
	note: string | null;
}

export interface CheckoutViewModel {
	pending: CheckoutPending;
	alreadySubmitted: boolean;
	rejectedSlip: RejectedSlipInfo | null;
	bankText: string | null;
	qrImageUrl: string | null;
}

/**
 * Resolve the checkout page view model.
 *
 * - Validates the pending enrollment belongs to the user.
 * - Redirects to the course if already paid.
 * - Determines whether a slip has already been submitted.
 * - Fetches bank details, QR image, and latest slip info in parallel.
 */
export async function resolveCheckout(
	pendingId: string,
	userId: string,
): Promise<CheckoutViewModel> {
	const pending = await getCheckoutPending(pendingId, userId);
	if (!pending) notFound();

	if (pending.status === "paid") {
		redirect(`/learn/${pending.courseSlug}`);
	}

	const alreadySubmitted = isSubmitted(pending.status as PendingStatus);

	const [bank, qrImageUrl, latestSlip] = await Promise.all([
		getBankDisplay(),
		getPromptPayQrImageUrl(),
		alreadySubmitted
			? Promise.resolve(null)
			: getLatestSlipForPending(pending.id),
	]);

	const rejectedSlip =
		latestSlip && latestSlip.status === "rejected"
			? {
					reasonLabel:
						REJECT_REASON_LABEL[latestSlip.rejectionReason as RejectReason] ??
						latestSlip.rejectionReason,
					note: latestSlip.rejectionNote,
				}
			: null;

	return {
		pending,
		alreadySubmitted,
		rejectedSlip,
		bankText: bank?.text ?? null,
		qrImageUrl,
	};
}

export interface CheckoutPendingViewModel {
	pending: CheckoutPending;
	userEmail: string;
}

/**
 * Resolve the pending-status page view model.
 */
export async function resolveCheckoutPending(
	pendingId: string,
	userId: string,
	userEmail: string,
): Promise<CheckoutPendingViewModel> {
	const pending = await getCheckoutPending(pendingId, userId);
	if (!pending) notFound();

	return { pending, userEmail };
}
