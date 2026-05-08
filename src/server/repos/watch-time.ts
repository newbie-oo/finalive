import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { lessonProgress } from "@/db/schema/progress";

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
};
