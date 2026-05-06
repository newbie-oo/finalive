import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { paymentSlip, pendingEnrollment } from "@/db/schema/payment";
import { enrollment } from "@/db/schema/enrollment";
import { course } from "@/db/schema/course";
import { certificate } from "@/db/schema/certificate";
import { user as userTable } from "@/db/schema/auth";

export interface RawActivityRow {
	time: Date;
	userName: string | null;
	action: string;
	amount: number | null;
	status: string; // "success" | "warning" | "primary"
}

export const ActivityRepo = {
	async getRecent(limit = 6): Promise<RawActivityRow[]> {
		const [enrollRows, slipRows, certRows] = await Promise.all([
			db
				.select({
					time: enrollment.createdAt,
					userName: userTable.name,
					action: sql<string>`'สมัครคอร์ส ' || ${course.title}`,
					amount: enrollment.priceAtPurchase,
				})
				.from(enrollment)
				.innerJoin(course, eq(course.id, enrollment.courseId))
				.innerJoin(userTable, eq(userTable.id, enrollment.userId))
				.orderBy(desc(enrollment.createdAt))
				.limit(limit),
			db
				.select({
					time: paymentSlip.createdAt,
					userName: userTable.name,
					action: sql<string>`'อัปโหลดสลิปการชำระเงิน'`,
					amount: paymentSlip.expectedAmount,
				})
				.from(paymentSlip)
				.innerJoin(
					pendingEnrollment,
					eq(pendingEnrollment.id, paymentSlip.pendingEnrollmentId),
				)
				.innerJoin(userTable, eq(userTable.id, pendingEnrollment.userId))
				.where(eq(paymentSlip.status, "submitted"))
				.orderBy(desc(paymentSlip.createdAt))
				.limit(limit),
			db
				.select({
					time: certificate.issuedAt,
					userName: userTable.name,
					action: sql<string>`'รับใบประกาศ ' || ${course.title}`,
					amount: sql<number>`0`,
				})
				.from(certificate)
				.innerJoin(enrollment, eq(enrollment.id, certificate.enrollmentId))
				.innerJoin(course, eq(course.id, enrollment.courseId))
				.innerJoin(userTable, eq(userTable.id, enrollment.userId))
				.orderBy(desc(certificate.issuedAt))
				.limit(limit),
		]);

		const all: RawActivityRow[] = [
			...enrollRows.map((r) => ({
				time: r.time,
				userName: r.userName,
				action: r.action,
				amount: Number(r.amount) > 0 ? Number(r.amount) : null,
				status: "success",
			})),
			...slipRows.map((r) => ({
				time: r.time,
				userName: r.userName,
				action: r.action,
				amount: Number(r.amount),
				status: "warning",
			})),
			...certRows.map((r) => ({
				time: r.time,
				userName: r.userName,
				action: r.action,
				amount: null,
				status: "primary",
			})),
		];

		all.sort((a, b) => b.time.getTime() - a.time.getTime());
		return all.slice(0, limit);
	},
};
