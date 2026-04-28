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
