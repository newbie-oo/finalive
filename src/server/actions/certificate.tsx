"use server";

import { getSession } from "@/server/auth-session";
import { certificateIssuerFactory } from "@/server/services/certificate-factory";

export async function issueCertificate(enrollmentId: string) {
	const session = await getSession();
	if (!session?.user?.id) {
		return { ok: false, error: "unauthorized" as const };
	}

	const issuer = certificateIssuerFactory();

	return issuer.issue(
		enrollmentId,
		session.user.id,
		session.user.role,
		session.user.email,
	);
}
