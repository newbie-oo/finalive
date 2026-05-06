import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { courseModule, lesson } from "@/db/schema/course";

// Reorder helpers run as a single TX. The actual sortOrder rewrite happens in
// two statements: first push every row's sortOrder into a non-clashing range
// (negative numbers), then write the final positions in a CASE expression.
// This keeps the unique (parent, sortOrder) constraint satisfied at every
// statement boundary even when the new order overlaps the old one.
//
// We also assert that the count of rows updated equals the input length, so
// callers passing bogus ids or ids belonging to another parent get a hard
// failure instead of a silent partial-write.

async function rewriteSortOrder(opts: {
	table: typeof courseModule | typeof lesson;
	parentColumn: typeof courseModule.courseId | typeof lesson.moduleId;
	parentId: string;
	ids: string[];
}) {
	const { table, parentColumn, parentId, ids } = opts;
	if (ids.length === 0) return;
	await db.transaction(async (tx) => {
		const moveAside = await tx
			.update(table)
			.set({
				sortOrder: sql`-${table.sortOrder} - 1`,
				updatedAt: new Date(),
			})
			.where(and(eq(parentColumn, parentId), inArray(table.id, ids)))
			.returning({ id: table.id });

		if (moveAside.length !== ids.length) {
			throw new Error(
				`reorder: expected ${ids.length} rows for parent, got ${moveAside.length} — refusing partial write`,
			);
		}

		const cases = sql.join(
			ids.map((id, i) => sql`when ${table.id} = ${id} then ${i}`),
			sql.raw(" "),
		);
		await tx
			.update(table)
			.set({
				sortOrder: sql`case ${cases} else ${table.sortOrder} end`,
				updatedAt: new Date(),
			})
			.where(and(eq(parentColumn, parentId), inArray(table.id, ids)));
	});
}

export async function reorderAdminModules(
	courseId: string,
	moduleIds: string[],
) {
	await rewriteSortOrder({
		table: courseModule,
		parentColumn: courseModule.courseId,
		parentId: courseId,
		ids: moduleIds,
	});
}

export async function reorderAdminLessons(
	moduleId: string,
	lessonIds: string[],
) {
	await rewriteSortOrder({
		table: lesson,
		parentColumn: lesson.moduleId,
		parentId: moduleId,
		ids: lessonIds,
	});
}
