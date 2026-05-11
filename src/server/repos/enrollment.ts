import "server-only";
import { and, eq, desc } from "drizzle-orm";
import { db } from "@/db/client";
import { enrollment } from "@/db/schema/enrollment";
import { course } from "@/db/schema/course";

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

	async listByUserId(userId: string): Promise<
		Array<{
			id: string;
			courseTitle: string;
			source: string;
			status: string;
			createdAt: Date | null;
		}>
	> {
		return db
			.select({
				id: enrollment.id,
				courseTitle: course.title,
				source: enrollment.source,
				status: enrollment.status,
				createdAt: enrollment.createdAt,
			})
			.from(enrollment)
			.innerJoin(course, eq(enrollment.courseId, course.id))
			.where(eq(enrollment.userId, userId))
			.orderBy(desc(enrollment.createdAt));
	},

	async getById(enrollmentId: string): Promise<{
		id: string;
		userId: string;
		completedAt: Date | null;
	} | null> {
		const rows = await db
			.select({
				id: enrollment.id,
				userId: enrollment.userId,
				completedAt: enrollment.completedAt,
			})
			.from(enrollment)
			.where(eq(enrollment.id, enrollmentId))
			.limit(1);
		return rows[0] ?? null;
	},

	async getCourseTitleById(enrollmentId: string): Promise<string | null> {
		const rows = await db
			.select({ title: course.title })
			.from(enrollment)
			.innerJoin(course, eq(enrollment.courseId, course.id))
			.where(eq(enrollment.id, enrollmentId))
			.limit(1);
		return rows[0]?.title ?? null;
	},

	async cancelByUserId(userId: string): Promise<void> {
		await db
			.update(enrollment)
			.set({ status: "cancelled", updatedAt: new Date() })
			.where(eq(enrollment.userId, userId));
	},
};
