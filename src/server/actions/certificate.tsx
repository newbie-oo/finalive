"use server";

import { getSession } from "@/server/auth-session";
import { CertificateIssuer } from "@/server/certificates/certificate-issuer";
import { ReactPdfCertificateRenderer } from "@/server/certificates/certificate-renderer";
import { R2ObjectStorage } from "@/server/services/storage";
import { EmailCourseCompletionNotifier } from "@/server/services/notifier";

export async function issueCertificate(enrollmentId: string) {
	const session = await getSession();
	if (!session?.user?.id) {
		return { ok: false, error: "unauthorized" as const };
	}

	const issuer = new CertificateIssuer({
		renderer: new ReactPdfCertificateRenderer(),
		storage: new R2ObjectStorage("public"),
		notifier: new EmailCourseCompletionNotifier(),
	});

	return issuer.issue(
		enrollmentId,
		session.user.id,
		session.user.role,
		session.user.email,
	);
}
