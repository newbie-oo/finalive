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

const mockWithIdempotency = vi.fn();

vi.mock("@/server/repos/idempotency", () => ({
	withIdempotency: mockWithIdempotency,
}));

// We need to keep the real sniffSlipFile for integration-y assertions,
// but we can also mock it if needed. For now, let the real one run.

const { SlipUploadService } = await import("./slip-upload-service");

// --- helpers ------------------------------------------------------------------

function fakeDeps() {
	return {
		repo: {
			loadForReview: vi.fn().mockResolvedValue(null),
			countSlipsForPending: vi.fn().mockResolvedValue(0),
			loadPending: vi.fn().mockResolvedValue(null),
			loadCourseInfo: vi.fn().mockResolvedValue(null),
			runAcceptTx: vi.fn().mockResolvedValue({ enrollmentId: "enr-1" }),
			runRejectTx: vi.fn().mockResolvedValue({ pendingId: "p1" }),
			reserveMediaAsset: vi.fn().mockResolvedValue("media-123"),
			finalizeUploadTx: vi.fn().mockResolvedValue("slip-456"),
			getSlipImageMedia: vi.fn().mockResolvedValue(null),
		},
		storage: {
			put: vi.fn().mockResolvedValue(undefined),
			delete: vi.fn().mockResolvedValue(undefined),
			urlFor: vi.fn().mockReturnValue("https://cdn.example.com/test"),
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
		adminNotifyEmail: () => "admin@test.local",
	};
}

function mockSelectReturns(rows: unknown[]) {
	const limit = vi.fn().mockResolvedValue(rows);
	const where = vi.fn().mockReturnValue({ limit });
	const from = vi.fn().mockReturnValue({ where });
	mockDb.select.mockReturnValue({ from });
}

const fakeUser = { id: "user-1", email: "u@example.com", name: "U" };

// --- tests --------------------------------------------------------------------

describe("SlipUploadService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDb.select.mockReset();
		mockDb.insert.mockReset();
		mockDb.update.mockReset();
		mockDb.transaction.mockReset();
		mockWithIdempotency.mockReset();
	});

	it("rejects empty files", async () => {
		mockWithIdempotency.mockImplementation(async ({ run }) => run());
		const deps = fakeDeps();
		const svc = new SlipUploadService(deps);

		await expect(
			svc.upload({ pendingId: "p1", bytes: Buffer.alloc(0) }, fakeUser),
		).rejects.toThrow("file size out of range");
	});

	it("rejects files over 5 MB", async () => {
		mockWithIdempotency.mockImplementation(async ({ run }) => run());
		const deps = fakeDeps();
		const svc = new SlipUploadService(deps);

		await expect(
			svc.upload(
				{ pendingId: "p1", bytes: Buffer.alloc(5 * 1024 * 1024 + 1) },
				fakeUser,
			),
		).rejects.toThrow("file size out of range");
	});

	it("rejects unknown file types", async () => {
		mockWithIdempotency.mockImplementation(async ({ run }) => run());
		const deps = fakeDeps();
		const svc = new SlipUploadService(deps);

		await expect(
			svc.upload(
				{ pendingId: "p1", bytes: Buffer.from("not an image") },
				fakeUser,
			),
		).rejects.toThrow("file content must be PNG, JPEG, PDF, or HEIC");
	});

	it("rejects when pending enrollment not found", async () => {
		mockWithIdempotency.mockImplementation(async ({ run }) => run());
		mockSelectReturns([]);
		const deps = fakeDeps();
		const svc = new SlipUploadService(deps);

		await expect(
			svc.upload(
				{ pendingId: "p1", bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47]) },
				fakeUser,
			),
		).rejects.toThrow("pending not found");
	});

	it("rejects when pending belongs to another user", async () => {
		mockWithIdempotency.mockImplementation(async ({ run }) => run());
		const deps = fakeDeps();
		deps.repo.loadPending = vi.fn().mockResolvedValue({
			id: "p1",
			userId: "user-2",
			courseId: "c1",
			amount: "100",
			status: "awaiting_payment",
			expiresAt: new Date(Date.now() + 3600_000),
			refCode: "REF123",
		});
		const svc = new SlipUploadService(deps);

		await expect(
			svc.upload(
				{ pendingId: "p1", bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47]) },
				fakeUser,
			),
		).rejects.toThrow("not your pending");
	});

	it("rejects when pending is already paid", async () => {
		mockWithIdempotency.mockImplementation(async ({ run }) => run());
		const deps = fakeDeps();
		deps.repo.loadPending = vi.fn().mockResolvedValue({
			id: "p1",
			userId: "user-1",
			courseId: "c1",
			amount: "100",
			status: "paid",
			expiresAt: new Date(Date.now() + 3600_000),
			refCode: "REF123",
		});
		const svc = new SlipUploadService(deps);

		await expect(
			svc.upload(
				{ pendingId: "p1", bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47]) },
				fakeUser,
			),
		).rejects.toThrow("already paid");
	});

	it("rejects when pending has expired", async () => {
		mockWithIdempotency.mockImplementation(async ({ run }) => run());
		const deps = fakeDeps();
		deps.repo.loadPending = vi.fn().mockResolvedValue({
			id: "p1",
			userId: "user-1",
			courseId: "c1",
			amount: "100",
			status: "awaiting_payment",
			expiresAt: new Date(Date.now() - 1000),
			refCode: "REF123",
		});
		const svc = new SlipUploadService(deps);

		await expect(
			svc.upload(
				{ pendingId: "p1", bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47]) },
				fakeUser,
			),
		).rejects.toThrow("pending has expired");
	});

	it("succeeds end-to-end with a PNG file", async () => {
		mockWithIdempotency.mockImplementation(async ({ run }) => run());

		const deps = fakeDeps();
		deps.repo.loadPending = vi.fn().mockResolvedValue({
			id: "p1",
			userId: "user-1",
			courseId: "c1",
			amount: "100",
			status: "awaiting_payment",
			expiresAt: new Date(Date.now() + 3600_000),
			refCode: "REF123",
		});
		deps.repo.loadCourseInfo = vi.fn().mockResolvedValue({
			title: "Test Course",
			slug: "test",
		});
		deps.repo.reserveMediaAsset = vi.fn().mockResolvedValue("media-123");
		deps.repo.finalizeUploadTx = vi.fn().mockResolvedValue("slip-456");

		const svc = new SlipUploadService(deps);

		const result = await svc.upload(
			{ pendingId: "p1", bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47]) },
			fakeUser,
		);

		expect(result).toEqual({
			slipId: "slip-456",
			pendingId: "p1",
			status: "submitted",
		});

		expect(deps.storage.put).toHaveBeenCalledWith(
			expect.stringMatching(/^slips\/user-1\/p1\/[\w-]+\.png$/),
			expect.any(Buffer),
			"image/png",
		);

		expect(deps.repo.finalizeUploadTx).toHaveBeenCalledWith(
			expect.objectContaining({
				mediaId: "media-123",
				pendingId: "p1",
				userId: "user-1",
			}),
		);

		expect(deps.notifier.notifyStudentOfSlipReceipt).toHaveBeenCalledWith(
			expect.objectContaining({
				toEmail: "u@example.com",
				courseTitle: "Test Course",
				refCode: "REF123",
				amount: 100,
			}),
		);

		expect(deps.notifier.notifyAdminOfNewSlip).toHaveBeenCalledWith(
			expect.objectContaining({
				studentEmail: "u@example.com",
				courseTitle: "Test Course",
				refCode: "REF123",
				amount: 100,
			}),
		);

		expect(deps.auditLogger.log).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "payment_slip.uploaded",
				targetType: "payment_slip",
			}),
			undefined,
		);
	});
});
