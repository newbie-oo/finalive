import { describe, it, expect, beforeEach } from "vitest";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { course, courseModule, lesson } from "@/db/schema/course";
import { user as userTable } from "@/db/schema/auth";
import {
	reorderAdminModules,
	reorderAdminLessons,
} from "@/server/repos/reorder";

async function reset() {
	await db.execute(sql`TRUNCATE lesson, module, course, "user" CASCADE`);
}

async function seed() {
	const adminId = randomUUID();
	await db.insert(userTable).values({
		id: adminId,
		email: "a@t",
		name: "A",
		role: "admin",
	});
	const [c] = await db
		.insert(course)
		.values({
			slug: "ord",
			title: "Ord",
			summary: "S",
			ownerUserId: adminId,
			status: "draft",
			createdByUserId: adminId,
		})
		.returning({ id: course.id });

	const moduleIds: string[] = [];
	for (let i = 0; i < 3; i++) {
		const [m] = await db
			.insert(courseModule)
			.values({
				courseId: c!.id,
				title: `M${i}`,
				sortOrder: i,
				createdByUserId: adminId,
			})
			.returning({ id: courseModule.id });
		moduleIds.push(m!.id);
	}

	const lessonIds: string[] = [];
	for (let i = 0; i < 3; i++) {
		const [l] = await db
			.insert(lesson)
			.values({
				moduleId: moduleIds[0]!,
				title: `L${i}`,
				sortOrder: i,
				bodyMd: "# x",
				createdByUserId: adminId,
			})
			.returning({ id: lesson.id });
		lessonIds.push(l!.id);
	}

	return { courseId: c!.id, moduleIds, lessonIds };
}

describe("reorderAdminModules / reorderAdminLessons — atomicity", () => {
	beforeEach(reset);

	it("rejects bogus ids without applying any partial reorder", async () => {
		const { courseId, moduleIds } = await seed();

		// Capture original order.
		const before = await db
			.select({ id: courseModule.id, sort: courseModule.sortOrder })
			.from(courseModule)
			.where(eq(courseModule.courseId, courseId));
		const beforeSorted = before.map((r) => r.sort).sort((a, b) => a - b);

		// One id is bogus — the call must fail and leave the table unchanged.
		const reordered = [moduleIds[2]!, randomUUID(), moduleIds[0]!];
		await expect(reorderAdminModules(courseId, reordered)).rejects.toThrow();

		const after = await db
			.select({ id: courseModule.id, sort: courseModule.sortOrder })
			.from(courseModule)
			.where(eq(courseModule.courseId, courseId));
		const afterSorted = after.map((r) => r.sort).sort((a, b) => a - b);

		// Same set of sortOrder values, same mapping.
		expect(afterSorted).toEqual(beforeSorted);
		for (const r of after) {
			const original = before.find((b) => b.id === r.id);
			expect(r.sort).toBe(original!.sort);
		}
	});

	it("applies reorder to modules in one TX", async () => {
		const { courseId, moduleIds } = await seed();
		const reordered = [moduleIds[2]!, moduleIds[0]!, moduleIds[1]!];
		await reorderAdminModules(courseId, reordered);

		const after = await db
			.select({ id: courseModule.id, sort: courseModule.sortOrder })
			.from(courseModule)
			.where(eq(courseModule.courseId, courseId));

		const sorted = [...after].sort((a, b) => a.sort - b.sort).map((r) => r.id);
		expect(sorted).toEqual(reordered);
	});

	it("applies reorder to lessons in one TX", async () => {
		const { moduleIds, lessonIds } = await seed();
		const reordered = [lessonIds[2]!, lessonIds[0]!, lessonIds[1]!];
		await reorderAdminLessons(moduleIds[0]!, reordered);

		const after = await db
			.select({ id: lesson.id, sort: lesson.sortOrder })
			.from(lesson)
			.where(eq(lesson.moduleId, moduleIds[0]!));

		const sorted = [...after].sort((a, b) => a.sort - b.sort).map((r) => r.id);
		expect(sorted).toEqual(reordered);
	});
});
