import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { enrollment } from "@/db/schema/enrollment";

export const EnrollmentRepo = {
	async hasActive(userId: string, courseId: string): Promise<boolean> {
		const rows = await db
			.select({ id: enrollment.id })
			.from(enrollment)
			.where(
				and(
					eq(enrollment.userId, userId),
					eq(enrollment.courseId, courseId),
					eq(enrollment.status, "active"),
				),
			)
			.limit(1);
		return rows.length > 0;
	},

	async create(args: {
		userId: string;
		courseId: string;
		source: string;
		priceAtPurchase: string;
		status: string;
		sourceGrantId?: string;
	}): Promise<void> {
		await db.insert(enrollment).values({
			userId: args.userId,
			courseId: args.courseId,
			source: args.source,
			sourceGrantId: args.sourceGrantId,
			priceAtPurchase: args.priceAtPurchase,
			status: args.status,
		});
	},
};
