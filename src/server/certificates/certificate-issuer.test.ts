import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

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
			delete: vi.fn().mockResolvedValue(undefined),
			urlFor: vi
				.fn()
				.mockImplementation((key: string) => `https://cdn.example.com/${key}`),
		},
		notifier: {
			notify: vi.fn().mockResolvedValue(undefined),
		},
		getCertificateByEnrollmentId: vi.fn().mockResolvedValue(null),
		getEnrollmentById: vi.fn().mockResolvedValue(null),
		getUserNameById: vi.fn().mockResolvedValue(null),
		getCourseTitleByEnrollmentId: vi.fn().mockResolvedValue(null),
		createMediaAsset: vi.fn().mockResolvedValue({ id: "media-123" }),
		createCertificate: vi.fn().mockResolvedValue(undefined),
		generateCertCode: vi.fn().mockReturnValue("CERT-2024-TEST9999"),
	};
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
		const deps = fakeDeps();
		deps.getCertificateByEnrollmentId.mockResolvedValue({
			certCode: "CERT-2024-ABCD1234",
		});
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
		const deps = fakeDeps();
		deps.getEnrollmentById.mockResolvedValue(null);
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
		const deps = fakeDeps();
		deps.getEnrollmentById.mockResolvedValue(
			makeEnrollment({ userId: "user-2" }),
		);
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
		const deps = fakeDeps();
		deps.getEnrollmentById.mockResolvedValue(
			makeEnrollment({ completedAt: null }),
		);
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
		const deps = fakeDeps();
		deps.getEnrollmentById.mockResolvedValue(
			makeEnrollment({ completedAt: new Date("2024-06-01") }),
		);
		deps.generateCertCode.mockReturnValue("CERT-2024-TEST9999");

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

		// Media asset created
		expect(deps.createMediaAsset).toHaveBeenCalledWith({
			kind: "pdf",
			storage: "r2_public",
			storageKey: "certs/CERT-2024-TEST9999.pdf",
			mimeType: "application/pdf",
			sizeBytes: expect.any(Number),
			status: "ready",
			createdByUserId: "user-1",
		});

		// Certificate row created
		expect(deps.createCertificate).toHaveBeenCalledWith({
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
		const deps = fakeDeps();
		deps.getEnrollmentById.mockResolvedValue(makeEnrollment());
		deps.getUserNameById.mockResolvedValue("Alice");
		deps.getCourseTitleByEnrollmentId.mockResolvedValue("Advanced React");
		deps.generateCertCode.mockReturnValue("CERT-2024-TEST8888");

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
		const deps = fakeDeps();
		deps.getEnrollmentById.mockResolvedValue(makeEnrollment());
		deps.notifier.notify.mockRejectedValue(new Error("SMTP down"));
		deps.generateCertCode.mockReturnValue("CERT-2024-TEST7777");

		const stderrWrite = vi
			.spyOn(process.stderr, "write")
			.mockImplementation(() => true);
		const issuer = new CertificateIssuer(deps);

		const result = await issuer.issue(
			"enroll-1",
			"user-1",
			"user",
			"user@example.com",
		);

		expect(result.ok).toBe(true);
		// Logger writes a single JSON line to process.stderr containing our event name.
		const stderrCalls = stderrWrite.mock.calls.map(
			(call) => String(call[0] ?? ""),
		);
		const errorLine = stderrCalls.find((line) =>
			line.includes("certificate.notify_failed"),
		);
		expect(errorLine).toBeTruthy();

		stderrWrite.mockRestore();
	});
});
