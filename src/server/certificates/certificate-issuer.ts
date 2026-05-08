import "server-only";
import type { CertificateRenderer } from "./certificate-renderer";
import type { ObjectStorage } from "@/server/services/storage";
import type { CourseCompletionNotifier } from "@/server/services/notifier";
import type { CertificateData } from "./certificate-doc";
import { logger } from "@/lib/logger";

export type IssueCertificateResult =
	| { ok: true; certCode: string; pdfUrl: string }
	| { ok: false; error: IssueCertificateError };

export type IssueCertificateError =
	| "admin_no_cert"
	| "enrollment_not_found"
	| "not_yours"
	| "not_completed";

export interface CertificateIssuerDeps {
	renderer: CertificateRenderer;
	storage: ObjectStorage;
	notifier: CourseCompletionNotifier;

	/** Idempotent: return existing certificate row if already issued. */
	getCertificateByEnrollmentId: (
		enrollmentId: string,
	) => Promise<{ certCode: string } | null>;

	/** Lookup enrollment by id. Returns null if not found. */
	getEnrollmentById: (
		enrollmentId: string,
	) => Promise<{ id: string; userId: string; completedAt: Date | null } | null>;

	/** Lookup user's display name. Returns null if not found. */
	getUserNameById: (userId: string) => Promise<string | null>;

	/** Resolve course title through an enrollment join. Returns null if not found. */
	getCourseTitleByEnrollmentId: (
		enrollmentId: string,
	) => Promise<string | null>;

	/** Persist a media_asset row for the generated PDF. */
	createMediaAsset: (args: {
		kind: string;
		storage: string;
		storageKey: string;
		mimeType: string;
		sizeBytes: number;
		status: string;
		createdByUserId: string;
	}) => Promise<{ id: string }>;

	/** Persist the certificate row linking enrollment to PDF. */
	createCertificate: (input: {
		enrollmentId: string;
		certCode: string;
		pdfMediaId: string;
	}) => Promise<unknown>;

	/** Generate a unique certificate code. */
	generateCertCode: () => string;
}

export class CertificateIssuer {
	constructor(private deps: CertificateIssuerDeps) {}

	async issue(
		enrollmentId: string,
		requestingUserId: string,
		requestingUserRole: string,
		requestingUserEmail: string,
	): Promise<IssueCertificateResult> {
		// Admins preview courses without paying or enrolling — by design they
		// never earn a certificate. Refuse here regardless of enrollment state.
		if (requestingUserRole === "admin") {
			return { ok: false, error: "admin_no_cert" };
		}

		// Idempotent: return existing certificate.
		const existing = await this.deps.getCertificateByEnrollmentId(enrollmentId);
		if (existing) {
			return {
				ok: true,
				certCode: existing.certCode,
				pdfUrl: this.deps.storage.urlFor(`certs/${existing.certCode}.pdf`),
			};
		}

		// Verify enrollment belongs to user and is completed.
		const enrollRow = await this.deps.getEnrollmentById(enrollmentId);

		if (!enrollRow) {
			return { ok: false, error: "enrollment_not_found" };
		}

		if (enrollRow.userId !== requestingUserId) {
			return { ok: false, error: "not_yours" };
		}

		if (!enrollRow.completedAt) {
			return { ok: false, error: "not_completed" };
		}

		// Fetch course title and student name.
		const studentName =
			(await this.deps.getUserNameById(requestingUserId)) ??
			requestingUserEmail ??
			"Student";

		const courseTitle =
			(await this.deps.getCourseTitleByEnrollmentId(enrollmentId)) ?? "Course";

		const certCode = this.deps.generateCertCode();

		// Render PDF.
		const certData: CertificateData = {
			studentName,
			courseTitle,
			completedAt: enrollRow.completedAt,
			certCode,
		};
		const pdfBuffer = await this.deps.renderer.render(certData);

		// Upload to storage.
		const key = `certs/${certCode}.pdf`;
		await this.deps.storage.put(key, pdfBuffer, "application/pdf");

		// Create media_asset for the PDF.
		const media = await this.deps.createMediaAsset({
			kind: "pdf",
			storage: "r2_public",
			storageKey: key,
			mimeType: "application/pdf",
			sizeBytes: pdfBuffer.length,
			status: "ready",
			createdByUserId: requestingUserId,
		});

		// Create certificate row.
		await this.deps.createCertificate({
			enrollmentId,
			certCode,
			pdfMediaId: media.id,
		});

		const pdfUrl = this.deps.storage.urlFor(key);

		// Best-effort email notification — failures here should not block the cert
		// issue itself. The email queue runs out-of-band so we just enqueue.
		try {
			await this.deps.notifier.notify({
				recipientEmail: requestingUserEmail,
				studentName,
				courseTitle,
				certCode,
				pdfUrl,
				userId: requestingUserId,
			});
		} catch (err) {
			logger.error("certificate.notify_failed", err, { certCode });
		}

		return { ok: true, certCode, pdfUrl };
	}
}
