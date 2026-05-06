import "server-only";
import { and, eq, gt, inArray, lte } from "drizzle-orm";
import { db } from "@/db/client";
import { course } from "@/db/schema/course";
import { pendingEnrollment } from "@/db/schema/payment";

export const PendingEnrollmentRepo = {
	async getCourseBySlug(
		slug: string,
	): Promise<
		{ id: string; price: string; isFree: boolean; status: string } | undefined
	> {
		const rows = await db
			.select({
				id: course.id,
				price: course.price,
				isFree: course.isFree,
				status: course.status,
			})
			.from(course)
			.where(eq(course.slug, slug))
			.limit(1);
		return rows[0];
	},

	async findExistingPending(
		userId: string,
		courseId: string,
	): Promise<
		{ id: string; refCode: string; amount: string; expiresAt: Date } | undefined
	> {
		const rows = await db
			.select()
			.from(pendingEnrollment)
			.where(
				and(
					eq(pendingEnrollment.userId, userId),
					eq(pendingEnrollment.courseId, courseId),
					inArray(pendingEnrollment.status, [
						"awaiting_payment",
						"slip_submitted",
					]),
					gt(pendingEnrollment.expiresAt, new Date()),
				),
			)
			.limit(1);
		if (!rows[0]) return undefined;
		return {
			id: rows[0].id,
			refCode: rows[0].refCode,
			amount: rows[0].amount,
			expiresAt: rows[0].expiresAt,
		};
	},

	async expireOutdatedPendings(
		userId: string,
		courseId: string,
	): Promise<void> {
		await db
			.update(pendingEnrollment)
			.set({ status: "expired", updatedAt: new Date() })
			.where(
				and(
					eq(pendingEnrollment.userId, userId),
					eq(pendingEnrollment.courseId, courseId),
					inArray(pendingEnrollment.status, [
						"awaiting_payment",
						"slip_submitted",
					]),
					lte(pendingEnrollment.expiresAt, new Date()),
				),
			);
	},

	async insertPending(args: {
		userId: string;
		courseId: string;
		amount: string;
		refCode: string;
		expiresAt: Date;
	}): Promise<
		{ id: string; refCode: string; amount: string; expiresAt: Date } | undefined
	> {
		const [row] = await db
			.insert(pendingEnrollment)
			.values({
				userId: args.userId,
				courseId: args.courseId,
				amount: args.amount,
				refCode: args.refCode,
				status: "awaiting_payment",
				expiresAt: args.expiresAt,
			})
			.returning({
				id: pendingEnrollment.id,
				refCode: pendingEnrollment.refCode,
				amount: pendingEnrollment.amount,
				expiresAt: pendingEnrollment.expiresAt,
			});
		return row;
	},

	async getByRefCode(
		refCode: string,
	): Promise<{ id: string; userId: string; status: string } | undefined> {
		const rows = await db
			.select({
				id: pendingEnrollment.id,
				userId: pendingEnrollment.userId,
				status: pendingEnrollment.status,
			})
			.from(pendingEnrollment)
			.where(eq(pendingEnrollment.refCode, refCode))
			.limit(1);
		return rows[0];
	},
};
