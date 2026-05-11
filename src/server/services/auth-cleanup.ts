import "server-only";
import { EnrollmentRepo } from "@/server/repos/enrollment";
import { PendingEnrollmentRepo } from "@/server/repos/pending-enrollment";
import { deleteLessonProgressByUserId } from "@/server/repos/progress";
import { deleteQuizAttemptsByUserId } from "@/server/repos/quiz";

/**
 * Cancel-or-purge per-user app data before Better-Auth removes the user row.
 * Schema does NOT cascade FKs from the auth user table to app tables (the
 * userId columns are plain text), so we tidy up explicitly:
 *   - active enrollments → 'cancelled' (keep history for audit/cert)
 *   - pending enrollments → 'cancelled'
 *   - lesson progress + quiz attempts → deleted (PII, no audit value)
 * Certificate rows survive: the cert artifact remains verifiable by code.
 */
export async function purgeUserData(userId: string): Promise<void> {
	await EnrollmentRepo.cancelByUserId(userId);
	await PendingEnrollmentRepo.cancelOpenByUserId(userId);
	await deleteQuizAttemptsByUserId(userId);
	await deleteLessonProgressByUserId(userId);
}
