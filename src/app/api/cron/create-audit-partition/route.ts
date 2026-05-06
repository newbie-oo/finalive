import { sql } from "drizzle-orm";
import { db } from "@/db/client";
import { cronRoute } from "@/lib/cron-route";

function nextMonthName(d = new Date()): {
	table: string;
	start: string;
	end: string;
} {
	const y = d.getUTCFullYear();
	const m = d.getUTCMonth() + 1;
	const nextM = m === 12 ? 1 : m + 1;
	const nextY = m === 12 ? y + 1 : y;
	const mm = String(nextM).padStart(2, "0");
	const start = `${nextY}-${mm}-01`;
	const endM = nextM === 12 ? 1 : nextM + 1;
	const endY = nextM === 12 ? nextY + 1 : nextY;
	const endMm = String(endM).padStart(2, "0");
	const end = `${endY}-${endMm}-01`;
	return { table: `audit_log_${nextY}_${mm}`, start, end };
}

export const POST = cronRoute({
	handler: async () => {
		const { table, start, end } = nextMonthName();

		const exists = await db.execute<{ exists: boolean }>(sql`
			SELECT EXISTS (
				SELECT 1 FROM pg_class c
				JOIN pg_namespace n ON n.oid = c.relnamespace
				WHERE n.nspname = 'public'
					AND c.relname = ${table}
			) AS "exists"
		`);
		if (exists[0]?.exists) {
			return {
				ok: true,
				table,
				created: false,
				note: "already_exists",
			};
		}

		await db.execute(sql`
			CREATE TABLE ${sql.raw(table)} PARTITION OF audit_log
			FOR VALUES FROM (${start}) TO (${end})
		`);

		return { ok: true, table, created: true };
	},
});
