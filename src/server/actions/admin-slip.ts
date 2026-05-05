import "server-only";
import { requireRole } from "@/server/auth-session";
import { SlipReviewService } from "@/server/payments/slip-review-service";
import { EmailSlipNotifier } from "@/server/services/slip-notifier";
import { makeDbAuditLogger } from "@/server/services/audit-logger";
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

function makeService() {
  return new SlipReviewService({
    notifier: new EmailSlipNotifier(),
    auditLogger: makeDbAuditLogger(),
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
