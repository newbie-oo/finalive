// Pure FSM table for pending_enrollment.status transitions.
// Used by tests + (later) by the cron expirer + accept/reject actions.

export type PendingStatus =
  | "awaiting_payment"
  | "slip_submitted"
  | "paid"
  | "expired"
  | "cancelled";

const TRANSITIONS: Record<PendingStatus, ReadonlyArray<PendingStatus>> = {
  awaiting_payment: ["slip_submitted", "expired", "cancelled"],
  slip_submitted: ["paid", "awaiting_payment", "expired", "cancelled"],
  paid: [],
  expired: [],
  cancelled: [],
};

export function canTransition(from: PendingStatus, to: PendingStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

export function isTerminal(status: PendingStatus): boolean {
  return TRANSITIONS[status].length === 0;
}

// Status is "actionable" by the student — they can still navigate to
// /checkout for it (pay or upload a slip). Used by /account/enrollments.
export function isActionable(status: string): boolean {
  return status === "awaiting_payment" || status === "slip_submitted";
}

// Slip already exists for this pending — upload form should hide.
export function isSubmitted(status: string): boolean {
  return status === "slip_submitted" || status === "paid";
}

// Centralizes the impure expiry check; callers should mark their RSC force-dynamic.
// react-hooks/purity doesn't fire on plain server modules, so no disable comment is needed here.
export function isExpired(expiresAt: Date): boolean {
  return expiresAt.getTime() < Date.now();
}

export const PENDING_STATUS_LABEL: Record<PendingStatus, string> = {
  awaiting_payment: "รอชำระเงิน",
  slip_submitted: "รอ admin ตรวจ",
  paid: "พร้อมเรียน",
  expired: "หมดอายุ",
  cancelled: "ยกเลิก",
};
