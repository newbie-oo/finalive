"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/server/auth-session";
import { container } from "@/server/container";

export type { FreeEnrollmentResult } from "@/server/services/free-enrollment";

export async function enrollFreeCourse(courseSlug: string) {
	const { user } = await requireSession("/login");
	const service = container.freeEnrollment();
	const result = await service.enroll(user.id, courseSlug);
	revalidatePath(`/courses/${courseSlug}`);
	revalidatePath("/dashboard");
	revalidatePath("/account/enrollments");
	return result;
}
