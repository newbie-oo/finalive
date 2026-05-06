import "server-only";
import { eq, and } from "drizzle-orm";
import { db } from "@/db/client";
import { course, courseCollaborator } from "@/db/schema/course";

export async function getCourseOwnerId(
	courseId: string,
): Promise<string | null> {
	const rows = await db
		.select({ ownerUserId: course.ownerUserId })
		.from(course)
		.where(eq(course.id, courseId))
		.limit(1);
	return rows[0]?.ownerUserId ?? null;
}

export async function getCollaboratorRole(
	courseId: string,
	userId: string,
): Promise<string | null> {
	const rows = await db
		.select({ role: courseCollaborator.role })
		.from(courseCollaborator)
		.where(
			and(
				eq(courseCollaborator.courseId, courseId),
				eq(courseCollaborator.userId, userId),
			),
		)
		.limit(1);
	return rows[0]?.role ?? null;
}
