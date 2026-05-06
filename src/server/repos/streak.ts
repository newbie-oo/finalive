import "server-only";
import { eq, sql, desc } from "drizzle-orm";
import { db } from "@/db/client";
import { lessonProgress } from "@/db/schema/progress";

export const StreakRepo = {
	async getDates(userId: string): Promise<string[]> {
		const rows = await db
			.select({
				date: sql<string>`distinct date(${lessonProgress.lastWatchedAt})`.as(
					"date",
				),
			})
			.from(lessonProgress)
			.where(eq(lessonProgress.userId, userId))
			.orderBy(desc(sql`date`));

		return rows.map((r) => r.date);
	},
};
