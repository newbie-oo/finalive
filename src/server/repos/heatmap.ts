import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { lessonProgress } from "@/db/schema/progress";

export const HeatmapRepo = {
	async getData(userId: string, days: number): Promise<Map<string, number>> {
		const start = new Date();
		start.setDate(start.getDate() - days + 1);
		start.setHours(0, 0, 0, 0);

		const rows = await db
			.select({
				date: sql<string>`date(${lessonProgress.lastWatchedAt})`.as("date"),
				lessons:
					sql<number>`count(distinct ${lessonProgress.lessonId})::int`.as(
						"lessons",
					),
			})
			.from(lessonProgress)
			.where(
				and(
					eq(lessonProgress.userId, userId),
					sql`${lessonProgress.lastWatchedAt} >= ${start.toISOString()}`,
				),
			)
			.groupBy(sql`date`)
			.orderBy(sql`date`);

		const map = new Map<string, number>();
		for (const r of rows) {
			map.set(r.date, r.lessons);
		}
		return map;
	},
};
