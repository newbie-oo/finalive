// Client-safe constants — kept separate from the server action module
// (which imports `server-only`) so client components can re-use them
// without dragging the action runtime into the bundle.

export const REJECT_REASONS = [
  "blurry",
  "wrong_amount",
  "wrong_account",
  "stale_slip",
  "other",
] as const;
export type RejectReason = (typeof REJECT_REASONS)[number];

export const REJECT_REASON_LABEL: Record<RejectReason, string> = {
  blurry: "ภาพไม่ชัด",
  wrong_amount: "ยอดเงินไม่ตรง",
  wrong_account: "โอนผิดบัญชี",
  stale_slip: "slip เก่าเกิน",
  other: "อื่นๆ",
};
