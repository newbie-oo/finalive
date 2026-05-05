import type { IssueCertificateResult } from "@/server/certificates/certificate-issuer";

export interface CertificateIssuerLike {
	issue(
		enrollmentId: string,
		requestingUserId: string,
		requestingUserRole: string,
		requestingUserEmail: string,
	): Promise<IssueCertificateResult>;
}

export interface CourseCompletionCheckerDeps {
	/** Check if the whole course is completed and mark enrollment if so. */
	checkAndMarkCourseComplete: (
		userId: string,
		courseId: string,
	) => Promise<{ completed: boolean; enrollmentId: string | null }>;
	/** Issues the certificate PDF and notifies the student. */
	certificateIssuer: CertificateIssuerLike;
}

export interface ReevaluateResult {
	courseCompleted: boolean;
	certificateIssued: boolean;
}

/**
 * Lightweight checker for course completion without lesson-marking.
 * Use this when a quiz is passed or another non-lesson gate is cleared.
 */
export class CourseCompletionChecker {
	constructor(private deps: CourseCompletionCheckerDeps) {}

	async reevaluateCourseCompletion(params: {
		userId: string;
		userEmail: string;
		userRole?: string;
		courseId: string;
	}): Promise<ReevaluateResult> {
		const { completed, enrollmentId } =
			await this.deps.checkAndMarkCourseComplete(
				params.userId,
				params.courseId,
			);

		if (!completed || !enrollmentId) {
			return { courseCompleted: false, certificateIssued: false };
		}

		const certResult = await this.deps.certificateIssuer.issue(
			enrollmentId,
			params.userId,
			params.userRole ?? "student",
			params.userEmail,
		);

		return {
			courseCompleted: true,
			certificateIssued: certResult.ok,
		};
	}
}
