import { describe, it, expect } from "vitest";
import {
  canTransition,
  isTerminal,
  isActionable,
  isSubmitted,
  PENDING_STATUS_LABEL,
  type PendingStatus,
} from "./pending-fsm";

const ALL: PendingStatus[] = [
  "awaiting_payment",
  "slip_submitted",
  "paid",
  "expired",
  "cancelled",
];

describe("pending FSM", () => {
  it("awaiting_payment -> slip_submitted | expired | cancelled (only)", () => {
    const valid = ["slip_submitted", "expired", "cancelled"] as const;
    for (const to of ALL) {
      const expected = (valid as readonly string[]).includes(to);
      expect(canTransition("awaiting_payment", to)).toBe(expected);
    }
  });

  it("slip_submitted can revert to awaiting_payment (rejection) or move to paid", () => {
    expect(canTransition("slip_submitted", "paid")).toBe(true);
    expect(canTransition("slip_submitted", "awaiting_payment")).toBe(true);
    expect(canTransition("slip_submitted", "expired")).toBe(true);
    expect(canTransition("slip_submitted", "cancelled")).toBe(true);
    expect(canTransition("slip_submitted", "slip_submitted")).toBe(false);
  });

  it("isActionable is true only for in-flight states", () => {
    expect(isActionable("awaiting_payment")).toBe(true);
    expect(isActionable("slip_submitted")).toBe(true);
    expect(isActionable("paid")).toBe(false);
    expect(isActionable("expired")).toBe(false);
    expect(isActionable("cancelled")).toBe(false);
  });

  it("isSubmitted hides upload form for slip_submitted + paid", () => {
    expect(isSubmitted("slip_submitted")).toBe(true);
    expect(isSubmitted("paid")).toBe(true);
    expect(isSubmitted("awaiting_payment")).toBe(false);
  });

  it("PENDING_STATUS_LABEL covers all states", () => {
    for (const s of ALL) expect(PENDING_STATUS_LABEL[s]).toBeTruthy();
  });

  it("terminal states have no out-edges", () => {
    expect(isTerminal("paid")).toBe(true);
    expect(isTerminal("expired")).toBe(true);
    expect(isTerminal("cancelled")).toBe(true);
    expect(isTerminal("awaiting_payment")).toBe(false);
    expect(isTerminal("slip_submitted")).toBe(false);
    for (const to of ALL) {
      expect(canTransition("paid", to)).toBe(false);
      expect(canTransition("expired", to)).toBe(false);
      expect(canTransition("cancelled", to)).toBe(false);
    }
  });
});
