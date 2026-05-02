import "server-only";
import {
	PendingEnrollmentService,
	type CreatePendingResult,
} from "@/server/payments/pending-enrollment-service";
import { requireSession } from "@/server/auth-session";

export type { CreatePendingResult };

export async function createPendingEnrollment(
	courseSlug: string,
): Promise<CreatePendingResult> {
	const { user } = await requireSession("/login");
	const service = new PendingEnrollmentService();
	return service.create(user.id, courseSlug);
}
