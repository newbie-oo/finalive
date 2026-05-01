import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

// --- module-level mocks -----------------------------------------------------

const mockDb = {
	select: vi.fn(),
	insert: vi.fn(),
};

vi.mock("@/db/client", () => ({
	db: mockDb,
}));

const mockGetCertificateByEnrollmentId = vi.fn();
const mockCreateCertificate = vi.fn();

vi.mock("@/server/repos/certificate", () => ({
	getCertificateByEnrollmentId: mockGetCertificateByEnrollmentId,
	createCertificate: mockCreateCertificate,
}));

const mockGenerateCertCode = vi.fn();

vi.mock("@/server/services/cert-code", () => ({
	generateCertCode: mockGenerateCertCode,
}));

// --- dynamic import of the service under test -------------------------------

const { CertificateIssuer } = await import("./certificate-issuer");

// --- test helpers -----------------------------------------------------------

function fakeDeps() {
	return {
		renderer: {
			render: vi.fn().mockResolvedValue(Buffer.from("fake-pdf")),
		},
		storage: {
			put: vi.fn().mockResolvedValue(undefined),
			urlFor: vi
				.fn()
				.mockImplementation((key: string) => `https://cdn.example.com/${key}`),
		},
		notifier: {
			notify: vi.fn().mockResolvedValue(undefined),
		},
	};
}

function mockSelectReturns(rows: unknown[]) {
	const limit = vi.fn().mockResolvedValue(rows);
	const where = vi.fn().mockReturnValue({ limit });
	const innerJoin = vi.fn().mockReturnValue({ where });
	const from = vi.fn().mockReturnValue({ where, innerJoin });
	mockDb.select.mockReturnValue({ from });
}

function mockInsertReturns(rows: unknown[]) {
	const returning = vi.fn().mockResolvedValue(rows);
	const values = vi.fn().mockReturnValue({ returning });
	mockDb.insert.mockReturnValue({ values });
}

function makeEnrollment(
	overrides?: Partial<{ id: string; userId: string; completedAt: Date | null }>,
) {
	return {
		id: "enroll-1",
		userId: "user-1",
		completedAt: new Date("2024-01-15"),
		...overrides,
	};
}

// --- tests ------------------------------------------------------------------

describe("CertificateIssuer", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDb.select.mockReset();
		mockDb.insert.mockReset();
		mockGetCertificateByEnrollmentId.mockReset();
		mockCreateCertificate.mockReset();
		mockGenerateCertCode.mockReset();
	});

	it("returns admin_no_cert for admin users", async () => {
		const deps = fakeDeps();
		const issuer = new CertificateIssuer(deps);

		const result = await issuer.issue(
			"enroll-1",
			"admin-1",
			"admin",
			"admin@example.com",
		);

		expect(result).toEqual({ ok: false, error: "admin_no_cert" });
		expect(deps.renderer.render).not.toHaveBeenCalled();
	});

	it("returns existing certificate when already issued (idempotency)", async () => {
		mockGetCertificateByEnrollmentId.mockResolvedValue({
			certCode: "CERT-2024-ABCD1234",
		});
		const deps = fakeDeps();
		const issuer = new CertificateIssuer(deps);

		const result = await issuer.issue(
			"enroll-1",
			"user-1",
			"user",
			"user@example.com",
		);

		expect(result).toEqual({
			ok: true,
			certCode: "CERT-2024-ABCD1234",
			pdfUrl: "https://cdn.example.com/certs/CERT-2024-ABCD1234.pdf",
		});
		expect(deps.renderer.render).not.toHaveBeenCalled();
		expect(deps.storage.put).not.toHaveBeenCalled();
	});

	it("returns enrollment_not_found when enrollment does not exist", async () => {
		mockGetCertificateByEnrollmentId.mockResolvedValue(null);
		mockSelectReturns([]);
		const deps = fakeDeps();
		const issuer = new CertificateIssuer(deps);

		const result = await issuer.issue(
			"enroll-1",
			"user-1",
			"user",
			"user@example.com",
		);

		expect(result).toEqual({ ok: false, error: "enrollment_not_found" });
		expect(deps.renderer.render).not.toHaveBeenCalled();
	});

	it("returns not_yours when enrollment belongs to another user", async () => {
		mockGetCertificateByEnrollmentId.mockResolvedValue(null);
		mockSelectReturns([makeEnrollment({ userId: "user-2" })]);
		const deps = fakeDeps();
		const issuer = new CertificateIssuer(deps);

		const result = await issuer.issue(
			"enroll-1",
			"user-1",
			"user",
			"user@example.com",
		);

		expect(result).toEqual({ ok: false, error: "not_yours" });
		expect(deps.renderer.render).not.toHaveBeenCalled();
	});

	it("returns not_completed when enrollment is not completed", async () => {
		mockGetCertificateByEnrollmentId.mockResolvedValue(null);
		mockSelectReturns([makeEnrollment({ completedAt: null })]);
		const deps = fakeDeps();
		const issuer = new CertificateIssuer(deps);

		const result = await issuer.issue(
			"enroll-1",
			"user-1",
			"user",
			"user@example.com",
		);

		expect(result).toEqual({ ok: false, error: "not_completed" });
		expect(deps.renderer.render).not.toHaveBeenCalled();
	});

	it("issues a certificate end-to-end on success", async () => {
		mockGetCertificateByEnrollmentId.mockResolvedValue(null);
		mockSelectReturns([
			makeEnrollment({ completedAt: new Date("2024-06-01") }),
		]);
		mockInsertReturns([{ id: "media-123" }]);
		mockGenerateCertCode.mockReturnValue("CERT-2024-TEST9999");

		const deps = fakeDeps();
		const issuer = new CertificateIssuer(deps);

		const result = await issuer.issue(
			"enroll-1",
			"user-1",
			"user",
			"user@example.com",
		);

		expect(result).toEqual({
			ok: true,
			certCode: "CERT-2024-TEST9999",
			pdfUrl: "https://cdn.example.com/certs/CERT-2024-TEST9999.pdf",
		});

		// PDF rendered with correct data
		expect(deps.renderer.render).toHaveBeenCalledWith({
			studentName: "user@example.com",
			courseTitle: "Course",
			completedAt: new Date("2024-06-01"),
			certCode: "CERT-2024-TEST9999",
		});

		// Storage upload
		expect(deps.storage.put).toHaveBeenCalledWith(
			"certs/CERT-2024-TEST9999.pdf",
			expect.any(Buffer),
			"application/pdf",
		);

		// Certificate row created
		expect(mockCreateCertificate).toHaveBeenCalledWith({
			enrollmentId: "enroll-1",
			certCode: "CERT-2024-TEST9999",
			pdfMediaId: "media-123",
		});

		// Notification sent
		expect(deps.notifier.notify).toHaveBeenCalledWith({
			recipientEmail: "user@example.com",
			studentName: "user@example.com",
			courseTitle: "Course",
			certCode: "CERT-2024-TEST9999",
			pdfUrl: "https://cdn.example.com/certs/CERT-2024-TEST9999.pdf",
			userId: "user-1",
		});
	});

	it("uses student name from user row when available", async () => {
		mockGetCertificateByEnrollmentId.mockResolvedValue(null);
		mockSelectReturns([makeEnrollment()]);
		mockInsertReturns([{ id: "media-123" }]);
		mockGenerateCertCode.mockReturnValue("CERT-2024-TEST8888");

		// We need to simulate two different select calls:
		// 1. enrollment lookup (already set above)
		// 2. user name lookup → returns "Alice"
		// 3. course title lookup → returns "Advanced React"
		const limitEnrollment = vi.fn().mockResolvedValue([makeEnrollment()]);
		const whereEnrollment = vi.fn().mockReturnValue({ limit: limitEnrollment });
		const fromEnrollment = vi.fn().mockReturnValue({ where: whereEnrollment });

		const limitUser = vi.fn().mockResolvedValue([{ name: "Alice" }]);
		const whereUser = vi.fn().mockReturnValue({ limit: limitUser });
		const fromUser = vi.fn().mockReturnValue({ where: whereUser });

		const limitCourse = vi
			.fn()
			.mockResolvedValue([{ title: "Advanced React" }]);
		const whereCourse = vi.fn().mockReturnValue({ limit: limitCourse });
		const innerJoinCourse = vi.fn().mockReturnValue({ where: whereCourse });
		const fromCourse = vi
			.fn()
			.mockReturnValue({ where: whereCourse, innerJoin: innerJoinCourse });

		// Track call order to return different chains
		let callCount = 0;
		mockDb.select.mockImplementation(() => {
			callCount++;
			if (callCount === 1) return { from: fromEnrollment };
			if (callCount === 2) return { from: fromUser };
			return { from: fromCourse };
		});

		const deps = fakeDeps();
		const issuer = new CertificateIssuer(deps);

		const result = await issuer.issue(
			"enroll-1",
			"user-1",
			"user",
			"user@example.com",
		);

		expect(result.ok).toBe(true);
		expect(deps.renderer.render).toHaveBeenCalledWith(
			expect.objectContaining({
				studentName: "Alice",
				courseTitle: "Advanced React",
			}),
		);
	});

	it("does not fail when notifier throws (best-effort)", async () => {
		mockGetCertificateByEnrollmentId.mockResolvedValue(null);
		mockSelectReturns([makeEnrollment()]);
		mockInsertReturns([{ id: "media-123" }]);
		mockGenerateCertCode.mockReturnValue("CERT-2024-TEST7777");

		const deps = fakeDeps();
		deps.notifier.notify.mockRejectedValue(new Error("SMTP down"));

		const consoleError = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});
		const issuer = new CertificateIssuer(deps);

		const result = await issuer.issue(
			"enroll-1",
			"user-1",
			"user",
			"user@example.com",
		);

		expect(result.ok).toBe(true);
		expect(consoleError).toHaveBeenCalledWith(
			"certificate: failed to enqueue course_completed email",
			expect.any(Error),
		);

		consoleError.mockRestore();
	});
});
