import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/db/client";

export const AuditCronRepo = {
	async partitionExists(table: string): Promise<boolean> {
		const rows = await db.execute<{ exists: boolean }>(sql`
			SELECT EXISTS (
				SELECT 1 FROM pg_class c
				JOIN pg_namespace n ON n.oid = c.relnamespace
				WHERE n.nspname = 'public'
					AND c.relname = ${table}
			) AS "exists"
		`);
		return rows[0]?.exists ?? false;
	},

	async createPartition(
		table: string,
		start: string,
		end: string,
	): Promise<void> {
		await db.execute(sql`
			CREATE TABLE ${sql.raw(table)} PARTITION OF audit_log
			FOR VALUES FROM (${start}) TO (${end})
		`);
	},
};
