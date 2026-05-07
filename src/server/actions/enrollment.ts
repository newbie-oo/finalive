import "server-only";
import { revalidatePath } from "next/cache";
import {
  makePendingEnrollmentService,
  type CreatePendingResult,
} from "@/server/payments/pending-enrollment-service";
import { requireSession } from "@/server/auth-session";

export type { CreatePendingResult };

export async function createPendingEnrollment(
  courseSlug: string,
): Promise<CreatePendingResult> {
  const { user } = await requireSession("/login");
  const service = makePendingEnrollmentService();
  const result = await service.create(user.id, courseSlug);
  revalidatePath(`/courses/${courseSlug}`);
  return result;
}
