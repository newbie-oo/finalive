import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { lessonProgress } from "@/db/schema/progress";

function startOfWeekMonday(): Date {
	const now = new Date();
	const dayOfWeek = now.getUTCDay();
	const monday = new Date(now);
	monday.setUTCDate(now.getUTCDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
	monday.setUTCHours(0, 0, 0, 0);
	return monday;
}

export const WatchTimeRepo = {
	async getTotal(userId: string): Promise<number> {
		const rows = await db
			.select({
				total: sql<number>`coalesce(sum(${lessonProgress.watchedSeconds}), 0)::int`,
			})
			.from(lessonProgress)
			.where(eq(lessonProgress.userId, userId));
		return rows[0]?.total ?? 0;
	},

	async getWeekly(userId: string): Promise<number> {
		const monday = startOfWeekMonday();
		const rows = await db
			.select({
				total: sql<number>`coalesce(sum(${lessonProgress.watchedSeconds}), 0)::int`,
			})
			.from(lessonProgress)
			.where(
				and(
					eq(lessonProgress.userId, userId),
					sql`${lessonProgress.lastWatchedAt} >= ${monday.toISOString()}`,
				),
			);
		return rows[0]?.total ?? 0;
	},
};
