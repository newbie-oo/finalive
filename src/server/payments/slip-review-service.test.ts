import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

// --- mocks --------------------------------------------------------------------

const mockDb = {
	select: vi.fn(),
	insert: vi.fn(),
	update: vi.fn(),
	transaction: vi.fn(),
};

vi.mock("@/db/client", () => ({
	db: mockDb,
}));

const mockIsUniqueViolation = vi.fn().mockReturnValue(false);

vi.mock("@/lib/pg-error", () => ({
	isUniqueViolation: mockIsUniqueViolation,
}));

const { SlipReviewService } = await import("./slip-review-service");

// --- helpers ------------------------------------------------------------------

function fakeDeps() {
	return {
		repo: {
			loadForReview: vi.fn(),
			runAcceptTx: vi.fn(),
			runRejectTx: vi.fn(),
			loadPending: vi.fn(),
			loadCourseInfo: vi.fn(),
			reserveMediaAsset: vi.fn(),
			finalizeUploadTx: vi.fn(),
		},
		notifier: {
			notifyStudentOfSlipReceipt: vi.fn().mockResolvedValue(undefined),
			notifyAdminOfNewSlip: vi.fn().mockResolvedValue(undefined),
			notifyStudentOfSlipAcceptance: vi.fn().mockResolvedValue(undefined),
			notifyStudentOfSlipRejection: vi.fn().mockResolvedValue(undefined),
		},
		auditLogger: {
			log: vi.fn().mockResolvedValue(undefined),
		},
	};
}

function mockSelectReturns(rows: unknown[]) {
	const limit = vi.fn().mockResolvedValue(rows);
	const where = vi.fn().mockReturnValue({ limit });
	// Support chaining multiple innerJoin calls: .innerJoin().innerJoin().innerJoin().where().limit()
	const chain: Record<string, unknown> = {};
	const innerJoin = vi.fn().mockImplementation(() => chain);
	chain.innerJoin = innerJoin;
	chain.where = where;
	const from = vi.fn().mockReturnValue(chain);
	mockDb.select.mockReturnValue({ from });
}

function makeReviewRow(
	overrides?: Partial<{
		slipId: string;
		pendingId: string;
		pendingAmount: string;
		pendingRefCode: string;
		studentUserId: string;
		studentEmail: string;
		studentName: string | null;
		courseId: string;
		courseTitle: string;
		courseSlug: string;
	}>,
) {
	return {
		slipId: "slip-1",
		pendingId: "pending-1",
		pendingAmount: "100",
		pendingRefCode: "REF123",
		studentUserId: "student-1",
		studentEmail: "student@example.com",
		studentName: "Student Name",
		courseId: "course-1",
		courseTitle: "Test Course",
		courseSlug: "test-course",
		...overrides,
	};
}

const adminUserId = "admin-1";

// --- tests --------------------------------------------------------------------

describe("SlipReviewService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDb.select.mockReset();
		mockDb.insert.mockReset();
		mockDb.update.mockReset();
		mockDb.transaction.mockReset();
		mockIsUniqueViolation.mockReset().mockReturnValue(false);
	});

	describe("loadSlipForReview", () => {
		it("throws not_found when slip does not exist", async () => {
			mockSelectReturns([]);
			const deps = fakeDeps();
			const svc = new SlipReviewService(deps);

			await expect(svc.accept("slip-1", adminUserId)).rejects.toThrow(
				"slip not found",
			);
		});
	});

	describe("accept", () => {
		it("accepts a slip successfully", async () => {
			mockSelectReturns([makeReviewRow()]);

			mockDb.transaction.mockImplementation(async (fn) => {
				const tx = {
					...mockDb,
					update: vi.fn().mockReturnValue({
						set: vi.fn().mockReturnValue({
							where: vi.fn().mockReturnValue({
								returning: vi.fn().mockResolvedValue([{ id: "slip-1" }]),
							}),
						}),
					}),
					insert: vi.fn().mockReturnValue({
						values: vi.fn().mockReturnValue({
							returning: vi.fn().mockResolvedValue([{ id: "enroll-1" }]),
						}),
					}),
				};
				return fn(tx);
			});

			const deps = fakeDeps();
			const svc = new SlipReviewService(deps);

			const result = await svc.accept("slip-1", adminUserId);

			expect(result).toEqual({ slipId: "slip-1", enrollmentId: "enroll-1" });
			expect(deps.notifier.notifyStudentOfSlipAcceptance).toHaveBeenCalledWith(
				expect.objectContaining({
					toEmail: "student@example.com",
					studentName: "Student Name",
					courseTitle: "Test Course",
					courseSlug: "test-course",
					refCode: "REF123",
					amount: 100,
					userId: "student-1",
				}),
			);
			expect(deps.auditLogger.log).toHaveBeenCalledWith(
				expect.objectContaining({
					action: "payment_slip.accepted",
					targetType: "payment_slip",
					targetId: "slip-1",
					actorUserId: adminUserId,
				}),
				expect.anything(),
			);
		});

		it("throws slip_already_reviewed when race condition", async () => {
			mockSelectReturns([makeReviewRow()]);

			mockDb.transaction.mockImplementation(async (fn) => {
				const tx = {
					...mockDb,
					update: vi.fn().mockReturnValue({
						set: vi.fn().mockReturnValue({
							where: vi.fn().mockReturnValue({
								returning: vi.fn().mockResolvedValue([]), // 0 rows = race lost
							}),
						}),
					}),
				};
				return fn(tx);
			});

			const deps = fakeDeps();
			const svc = new SlipReviewService(deps);

			await expect(svc.accept("slip-1", adminUserId)).rejects.toThrow(
				"slip was reviewed by another admin",
			);
		});

		it("throws enrollment_already_active on unique violation", async () => {
			mockSelectReturns([makeReviewRow()]);

			mockDb.transaction.mockImplementation(async (fn) => {
				const tx = {
					...mockDb,
					update: vi.fn().mockReturnValue({
						set: vi.fn().mockReturnValue({
							where: vi.fn().mockReturnValue({
								returning: vi.fn().mockResolvedValue([{ id: "slip-1" }]),
							}),
						}),
					}),
					insert: vi.fn().mockImplementation(() => {
						throw new Error("unique_violation");
					}),
				};
				return fn(tx);
			});

			mockIsUniqueViolation.mockReturnValue(true);

			const deps = fakeDeps();
			const svc = new SlipReviewService(deps);

			await expect(svc.accept("slip-1", adminUserId)).rejects.toThrow(
				"นักเรียนมีสิทธิ์เรียนคอร์สนี้อยู่แล้ว",
			);
		});

		it("falls back to email when student name is null", async () => {
			mockSelectReturns([makeReviewRow({ studentName: null })]);

			mockDb.transaction.mockImplementation(async (fn) => {
				const tx = {
					...mockDb,
					update: vi.fn().mockReturnValue({
						set: vi.fn().mockReturnValue({
							where: vi.fn().mockReturnValue({
								returning: vi.fn().mockResolvedValue([{ id: "slip-1" }]),
							}),
						}),
					}),
					insert: vi.fn().mockReturnValue({
						values: vi.fn().mockReturnValue({
							returning: vi.fn().mockResolvedValue([{ id: "enroll-1" }]),
						}),
					}),
				};
				return fn(tx);
			});

			const deps = fakeDeps();
			const svc = new SlipReviewService(deps);

			await svc.accept("slip-1", adminUserId);

			expect(deps.notifier.notifyStudentOfSlipAcceptance).toHaveBeenCalledWith(
				expect.objectContaining({
					studentName: "student@example.com",
				}),
			);
		});
	});

	describe("reject", () => {
		it("rejects a slip successfully", async () => {
			mockSelectReturns([makeReviewRow()]);

			mockDb.transaction.mockImplementation(async (fn) => {
				const tx = {
					...mockDb,
					update: vi.fn().mockReturnValue({
						set: vi.fn().mockReturnValue({
							where: vi.fn().mockReturnValue({
								returning: vi.fn().mockResolvedValue([{ id: "slip-1" }]),
							}),
						}),
					}),
				};
				return fn(tx);
			});

			const deps = fakeDeps();
			const svc = new SlipReviewService(deps);

			const result = await svc.reject(
				{ slipId: "slip-1", reason: "blurry" },
				adminUserId,
			);

			expect(result).toEqual({ slipId: "slip-1", pendingId: "pending-1" });
			expect(deps.notifier.notifyStudentOfSlipRejection).toHaveBeenCalledWith(
				expect.objectContaining({
					toEmail: "student@example.com",
					studentName: "Student Name",
					courseTitle: "Test Course",
					courseSlug: "test-course",
					refCode: "REF123",
					amount: 100,
					reasonLabel: "ภาพไม่ชัด",
					note: null,
					userId: "student-1",
				}),
			);
			expect(deps.auditLogger.log).toHaveBeenCalledWith(
				expect.objectContaining({
					action: "payment_slip.rejected",
					targetType: "payment_slip",
					targetId: "slip-1",
					actorUserId: adminUserId,
				}),
				expect.anything(),
			);
		});

		it("throws slip_already_reviewed when race condition", async () => {
			mockSelectReturns([makeReviewRow()]);

			mockDb.transaction.mockImplementation(async (fn) => {
				const tx = {
					...mockDb,
					update: vi.fn().mockReturnValue({
						set: vi.fn().mockReturnValue({
							where: vi.fn().mockReturnValue({
								returning: vi.fn().mockResolvedValue([]), // 0 rows = race lost
							}),
						}),
					}),
				};
				return fn(tx);
			});

			const deps = fakeDeps();
			const svc = new SlipReviewService(deps);

			await expect(
				svc.reject({ slipId: "slip-1", reason: "blurry" }, adminUserId),
			).rejects.toThrow("slip was reviewed by another admin");
		});

		it("passes note through when provided", async () => {
			mockSelectReturns([makeReviewRow()]);

			mockDb.transaction.mockImplementation(async (fn) => {
				const tx = {
					...mockDb,
					update: vi.fn().mockReturnValue({
						set: vi.fn().mockReturnValue({
							where: vi.fn().mockReturnValue({
								returning: vi.fn().mockResolvedValue([{ id: "slip-1" }]),
							}),
						}),
					}),
				};
				return fn(tx);
			});

			const deps = fakeDeps();
			const svc = new SlipReviewService(deps);

			await svc.reject(
				{ slipId: "slip-1", reason: "other", note: "Please retry" },
				adminUserId,
			);

			expect(deps.notifier.notifyStudentOfSlipRejection).toHaveBeenCalledWith(
				expect.objectContaining({
					note: "Please retry",
				}),
			);
		});
	});

	describe("bulkAccept", () => {
		it("accepts multiple slips with partial failures", async () => {
			const deps = fakeDeps();
			const svc = new SlipReviewService(deps);

			// Override accept to simulate mixed results
			svc.accept = vi.fn().mockImplementation(async (slipId: string) => {
				if (slipId === "slip-bad") {
					throw new Error("db connection lost");
				}
				return { slipId, enrollmentId: `enroll-${slipId}` };
			}) as unknown as typeof svc.accept;

			const result = await svc.bulkAccept(
				["slip-1", "slip-bad", "slip-2"],
				adminUserId,
			);

			expect(result.succeeded).toEqual(["slip-1", "slip-2"]);
			expect(result.failed).toHaveLength(1);
			expect(result.failed[0]).toMatchObject({
				slipId: "slip-bad",
				code: "internal_error",
				message: "db connection lost",
			});
		});

		it("rejects empty bulk", async () => {
			const deps = fakeDeps();
			const svc = new SlipReviewService(deps);

			await expect(svc.bulkAccept([], adminUserId)).rejects.toThrow(
				"bulk size must be 1..50",
			);
		});

		it("rejects oversized bulk", async () => {
			const deps = fakeDeps();
			const svc = new SlipReviewService(deps);

			await expect(
				svc.bulkAccept(Array(51).fill("s"), adminUserId),
			).rejects.toThrow("bulk size must be 1..50");
		});
	});

	describe("bulkReject", () => {
		it("rejects multiple slips with partial failures", async () => {
			const deps = fakeDeps();
			const svc = new SlipReviewService(deps);

			// Override reject to simulate mixed results
			svc.reject = vi
				.fn()
				.mockImplementation(async (input: { slipId: string }) => {
					if (input.slipId === "slip-bad") {
						throw new Error("timeout");
					}
					return { slipId: input.slipId, pendingId: "pending-1" };
				}) as unknown as typeof svc.reject;

			const result = await svc.bulkReject(
				["slip-1", "slip-bad"],
				"blurry",
				undefined,
				adminUserId,
			);

			expect(result.succeeded).toEqual(["slip-1"]);
			expect(result.failed).toHaveLength(1);
			expect(result.failed[0]).toMatchObject({
				slipId: "slip-bad",
				code: "internal_error",
				message: "timeout",
			});
		});
	});
});
