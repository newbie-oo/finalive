import "server-only";
import { CertificateIssuer } from "@/server/certificates/certificate-issuer";
import { ReactPdfCertificateRenderer } from "@/server/certificates/certificate-renderer";
import { R2ObjectStorage } from "@/server/services/storage";
import { makeEmailCourseCompletionNotifier } from "@/server/services/notifier-factory";
import {
	getCertificateByEnrollmentId,
	createCertificate,
} from "@/server/repos/certificate";
import { EnrollmentRepo } from "@/server/repos/enrollment";
import { UserRepo } from "@/server/repos/user";
import { MediaAssetRepo } from "@/server/repos/media-asset";
import { generateCertCode } from "@/server/services/cert-code";

/**
 * Factory for the real CertificateIssuer adapter.
 * Centralises construction so callers don't duplicate the object graph.
 */
export function certificateIssuerFactory(): CertificateIssuer {
	return new CertificateIssuer({
		renderer: new ReactPdfCertificateRenderer(),
		storage: new R2ObjectStorage("public"),
		notifier: makeEmailCourseCompletionNotifier(),

		getCertificateByEnrollmentId,

		getEnrollmentById: EnrollmentRepo.getById,

		getUserNameById: UserRepo.getNameById,

		getCourseTitleByEnrollmentId: EnrollmentRepo.getCourseTitleById,

		createMediaAsset: MediaAssetRepo.createRaw,

		createCertificate,
		generateCertCode,
	});
}
