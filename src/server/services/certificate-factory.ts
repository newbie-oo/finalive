import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { enrollment } from "@/db/schema/enrollment";
import { course } from "@/db/schema/course";
import { user as userTable } from "@/db/schema/auth";
import { mediaAsset } from "@/db/schema/media";
import { CertificateIssuer } from "@/server/certificates/certificate-issuer";
import { ReactPdfCertificateRenderer } from "@/server/certificates/certificate-renderer";
import { R2ObjectStorage } from "@/server/services/storage";
import { EmailCourseCompletionNotifier } from "@/server/services/notifier";
import {
	getCertificateByEnrollmentId,
	createCertificate,
} from "@/server/repos/certificate";
import { generateCertCode } from "@/server/services/cert-code";

/**
 * Factory for the real CertificateIssuer adapter.
 * Centralises construction so callers don't duplicate the object graph.
 */
export function certificateIssuerFactory(): CertificateIssuer {
	return new CertificateIssuer({
		renderer: new ReactPdfCertificateRenderer(),
		storage: new R2ObjectStorage("public"),
		notifier: new EmailCourseCompletionNotifier(),

		getCertificateByEnrollmentId,

		getEnrollmentById: async (enrollmentId) => {
			const [row] = await db
				.select({
					id: enrollment.id,
					userId: enrollment.userId,
					completedAt: enrollment.completedAt,
				})
				.from(enrollment)
				.where(eq(enrollment.id, enrollmentId))
				.limit(1);
			return row ?? null;
		},

		getUserNameById: async (userId) => {
			const [row] = await db
				.select({ name: userTable.name })
				.from(userTable)
				.where(eq(userTable.id, userId))
				.limit(1);
			return row?.name ?? null;
		},

		getCourseTitleByEnrollmentId: async (enrollmentId) => {
			const [row] = await db
				.select({ title: course.title })
				.from(enrollment)
				.innerJoin(course, eq(enrollment.courseId, course.id))
				.where(eq(enrollment.id, enrollmentId))
				.limit(1);
			return row?.title ?? null;
		},

		createMediaAsset: async (args) => {
			const [media] = await db
				.insert(mediaAsset)
				.values(args)
				.returning({ id: mediaAsset.id });
			return media!;
		},

		createCertificate,
		generateCertCode,
	});
}
