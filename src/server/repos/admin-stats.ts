import "server-only";
import { and, eq, gte, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { paymentSlip } from "@/db/schema/payment";
import { enrollment } from "@/db/schema/enrollment";
import { course } from "@/db/schema/course";
import { certificate } from "@/db/schema/certificate";

export interface AdminDashboardCounts {
	slipsSubmitted: number;
	slipsAcceptedToday: number;
	slipsRejectedToday: number;
	enrollmentsActive: number;
	coursesPublished: number;
	revenueMtd: number;
	certsMtd: number;
}

function startOfToday(): Date {
	const d = new Date();
	d.setHours(0, 0, 0, 0);
	return d;
}

function startOfMonth(): Date {
	const d = new Date();
	d.setDate(1);
	d.setHours(0, 0, 0, 0);
	return d;
}

export const AdminStatsRepo = {
	async getCounts(): Promise<AdminDashboardCounts> {
		const today = startOfToday();
		const monthStart = startOfMonth();

		const [
			submitted,
			acceptedToday,
			rejectedToday,
			activeEnroll,
			pubCourses,
			revenue,
			certs,
		] = await Promise.all([
			db
				.select({ n: sql<number>`count(*)::int` })
				.from(paymentSlip)
				.where(eq(paymentSlip.status, "submitted")),
			db
				.select({ n: sql<number>`count(*)::int` })
				.from(paymentSlip)
				.where(
					and(
						eq(paymentSlip.status, "accepted"),
						gte(paymentSlip.reviewedAt, today),
					),
				),
			db
				.select({ n: sql<number>`count(*)::int` })
				.from(paymentSlip)
				.where(
					and(
						eq(paymentSlip.status, "rejected"),
						gte(paymentSlip.reviewedAt, today),
					),
				),
			db
				.select({ n: sql<number>`count(*)::int` })
				.from(enrollment)
				.where(eq(enrollment.status, "active")),
			db
				.select({ n: sql<number>`count(*)::int` })
				.from(course)
				.where(and(eq(course.status, "published"), isNull(course.deletedAt))),
			db
				.select({
					total: sql<number>`COALESCE(sum(${enrollment.priceAtPurchase})::int, 0)`,
				})
				.from(enrollment)
				.where(
					and(
						eq(enrollment.source, "paid"),
						gte(enrollment.createdAt, monthStart),
					),
				),
			db
				.select({ n: sql<number>`count(*)::int` })
				.from(certificate)
				.where(gte(certificate.issuedAt, monthStart)),
		]);

		return {
			slipsSubmitted: submitted[0]?.n ?? 0,
			slipsAcceptedToday: acceptedToday[0]?.n ?? 0,
			slipsRejectedToday: rejectedToday[0]?.n ?? 0,
			enrollmentsActive: activeEnroll[0]?.n ?? 0,
			coursesPublished: pubCourses[0]?.n ?? 0,
			revenueMtd: revenue[0]?.total ?? 0,
			certsMtd: certs[0]?.n ?? 0,
		};
	},
};
