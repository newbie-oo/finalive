import { describe, it, expect, vi } from "vitest";
import { ApiError } from "@/lib/api-error";
import {
  PendingEnrollmentService,
  type PendingEnrollmentServiceDeps,
} from "./pending-enrollment-service";

vi.mock("server-only", () => ({}));
vi.mock("@/db/client", () => ({
  db: {},
}));

function fakeDeps(overrides?: Partial<PendingEnrollmentServiceDeps>) {
  const base = {
    getCourseBySlug: vi.fn().mockResolvedValue({
      id: "c1",
      price: "990",
      isFree: false,
      status: "published",
    }),
    findExistingPending: vi.fn().mockResolvedValue(undefined),
    expireOutdatedPendings: vi.fn().mockResolvedValue(undefined),
    insertPending: vi.fn().mockImplementation(async (args) => ({
      id: "p-" + args.refCode,
      refCode: args.refCode,
      amount: args.amount,
      expiresAt: args.expiresAt,
    })),
    generateRefCode: vi.fn().mockReturnValue("REF001"),
  };
  return { ...base, ...overrides };
}

describe("PendingEnrollmentService", () => {
  it("creates pending when course exists and no duplicate", async () => {
    const deps = fakeDeps();
    const svc = new PendingEnrollmentService(deps);
    const result = await svc.create("u1", "course-slug");
    expect(result.refCode).toBe("REF001");
    expect(result.amount).toBe("990");
    expect(deps.insertPending).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", courseId: "c1", amount: "990" }),
    );
  });

  it("returns existing pending when one is in-flight", async () => {
    const deps = fakeDeps({
      findExistingPending: vi.fn().mockResolvedValue({
        id: "p-old",
        refCode: "OLD001",
        amount: "990",
        expiresAt: new Date("2026-01-01"),
      }),
    });
    const svc = new PendingEnrollmentService(deps);
    const result = await svc.create("u1", "course-slug");
    expect(result.refCode).toBe("OLD001");
    expect(deps.insertPending).not.toHaveBeenCalled();
  });

  it("creates new pending when existing one is expired", async () => {
    const deps = fakeDeps({
      findExistingPending: vi.fn().mockResolvedValue(undefined),
    });
    const svc = new PendingEnrollmentService(deps);
    const result = await svc.create("u1", "course-slug");
    expect(result.refCode).toBe("REF001");
    expect(deps.expireOutdatedPendings).toHaveBeenCalledWith("u1", "c1");
    expect(deps.insertPending).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "u1", courseId: "c1" }),
    );
  });

  it("throws not_found when course does not exist", async () => {
    const deps = fakeDeps({
      getCourseBySlug: vi.fn().mockResolvedValue(undefined),
    });
    const svc = new PendingEnrollmentService(deps);
    await expect(svc.create("u1", "bad-slug")).rejects.toThrow(ApiError);
  });

  it("throws invalid_state when course is not published", async () => {
    const deps = fakeDeps({
      getCourseBySlug: vi.fn().mockResolvedValue({
        id: "c1",
        price: "990",
        isFree: false,
        status: "draft",
      }),
    });
    const svc = new PendingEnrollmentService(deps);
    await expect(svc.create("u1", "course-slug")).rejects.toThrow(
      "not published",
    );
  });

  it("throws invalid_state when course is free", async () => {
    const deps = fakeDeps({
      getCourseBySlug: vi.fn().mockResolvedValue({
        id: "c1",
        price: "0",
        isFree: true,
        status: "published",
      }),
    });
    const svc = new PendingEnrollmentService(deps);
    await expect(svc.create("u1", "course-slug")).rejects.toThrow(
      "free course",
    );
  });

  it("retries ref-code on unique violation", async () => {
    const deps = fakeDeps({
      generateRefCode: vi
        .fn()
        .mockReturnValueOnce("DUP")
        .mockReturnValueOnce("OK"),
      insertPending: vi
        .fn()
        .mockRejectedValueOnce({
          code: "23505",
          constraint_name: "pending_enrollment_ref_code_unique",
        })
        .mockResolvedValueOnce({
          id: "p-OK",
          refCode: "OK",
          amount: "990",
          expiresAt: new Date(),
        }),
    });
    const svc = new PendingEnrollmentService(deps);
    const result = await svc.create("u1", "course-slug");
    expect(result.refCode).toBe("OK");
    expect(deps.insertPending).toHaveBeenCalledTimes(2);
  });
});
