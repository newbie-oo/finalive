import "server-only";
import { db } from "@/db/client";
import { adminGrant } from "@/db/schema/enrollment";

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
};
