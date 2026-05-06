import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { enrollment } from "@/db/schema/enrollment";

export interface MonthlyRevenueRaw {
	monthIndex: number; // 0-11
	year: number;
	current: number;
	previous: number;
}

function startOfMonthAt(year: number, month: number): Date {
	const d = new Date(year, month, 1);
	d.setHours(0, 0, 0, 0);
	return d;
}

export const RevenueRepo = {
	async getMonthlyRevenue(): Promise<MonthlyRevenueRaw[]> {
		const now = new Date();
		const months: Array<{ year: number; month: number }> = [];

		for (let i = 4; i >= 0; i--) {
			const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
			months.push({ year: d.getFullYear(), month: d.getMonth() });
		}

		const currentStart = startOfMonthAt(months[0]!.year, months[0]!.month);
		const currentEnd = startOfMonthAt(
			months[months.length - 1]!.year,
			months[months.length - 1]!.month + 1,
		);
		const prevStart = startOfMonthAt(months[0]!.year - 1, months[0]!.month);
		const prevEnd = startOfMonthAt(
			months[months.length - 1]!.year - 1,
			months[months.length - 1]!.month + 1,
		);

		const [currentRows, prevRows] = await Promise.all([
			db
				.select({
					year: sql<number>`extract(year from ${enrollment.createdAt})::int`,
					month: sql<number>`extract(month from ${enrollment.createdAt})::int - 1`,
					total: sql<number>`COALESCE(sum(${enrollment.priceAtPurchase})::int, 0)`,
				})
				.from(enrollment)
				.where(
					and(
						eq(enrollment.source, "paid"),
						gte(enrollment.createdAt, currentStart),
						sql`${enrollment.createdAt} < ${currentEnd.toISOString()}`,
					),
				)
				.groupBy(
					sql`extract(year from ${enrollment.createdAt})`,
					sql`extract(month from ${enrollment.createdAt})`,
				),
			db
				.select({
					year: sql<number>`extract(year from ${enrollment.createdAt})::int`,
					month: sql<number>`extract(month from ${enrollment.createdAt})::int - 1`,
					total: sql<number>`COALESCE(sum(${enrollment.priceAtPurchase})::int, 0)`,
				})
				.from(enrollment)
				.where(
					and(
						eq(enrollment.source, "paid"),
						gte(enrollment.createdAt, prevStart),
						sql`${enrollment.createdAt} < ${prevEnd.toISOString()}`,
					),
				)
				.groupBy(
					sql`extract(year from ${enrollment.createdAt})`,
					sql`extract(month from ${enrollment.createdAt})`,
				),
		]);

		const currentMap = new Map(
			currentRows.map((r) => [`${r.year}-${r.month}`, r.total]),
		);
		const prevMap = new Map(
			prevRows.map((r) => [`${r.year}-${r.month}`, r.total]),
		);

		return months.map((m) => ({
			monthIndex: m.month,
			year: m.year,
			current: currentMap.get(`${m.year}-${m.month}`) ?? 0,
			previous: prevMap.get(`${m.year - 1}-${m.month}`) ?? 0,
		}));
	},
};
