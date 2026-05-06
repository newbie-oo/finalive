import "server-only";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db/client";
import { adminGrant } from "@/db/schema/enrollment";
import { course } from "@/db/schema/course";

export const AdminGrantRepo = {
	async create(args: {
		adminUserId: string;
		studentUserId: string;
		courseId: string;
		reason: string;
		note?: string;
	}): Promise<string> {
		const [row] = await db
			.insert(adminGrant)
			.values({
				adminUserId: args.adminUserId,
				studentUserId: args.studentUserId,
				courseId: args.courseId,
				reason: args.reason,
				note: args.note,
			})
			.returning({ id: adminGrant.id });
		return row!.id;
	},

	async listByStudentId(studentUserId: string): Promise<
		Array<{
			id: string;
			courseTitle: string;
			reason: string;
			note: string | null;
			grantedAt: Date | null;
		}>
	> {
		return db
			.select({
				id: adminGrant.id,
				courseTitle: course.title,
				reason: adminGrant.reason,
				note: adminGrant.note,
				grantedAt: adminGrant.grantedAt,
			})
			.from(adminGrant)
			.innerJoin(course, eq(adminGrant.courseId, course.id))
			.where(eq(adminGrant.studentUserId, studentUserId))
			.orderBy(desc(adminGrant.grantedAt));
	},
};
