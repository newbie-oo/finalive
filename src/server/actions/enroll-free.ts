"use server";

import { requireSession } from "@/server/auth-session";
import { container } from "@/server/container";

export type { FreeEnrollmentResult } from "@/server/services/free-enrollment";

export async function enrollFreeCourse(courseSlug: string) {
	const { user } = await requireSession("/login");
	const service = container.freeEnrollment();
	return service.enroll(user.id, courseSlug);
}
