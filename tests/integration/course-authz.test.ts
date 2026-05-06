import { describe, it, expect, beforeEach } from "vitest";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { course, courseCollaborator } from "@/db/schema/course";
import { user as userTable } from "@/db/schema/auth";
import {
	getCourseAccessPure,
	canEditCoursePure,
} from "@/server/services/course-authz";
import {
	getCourseOwnerId,
	getCollaboratorRole,
} from "@/server/repos/course-authz";

async function reset() {
	await db.execute(sql`TRUNCATE course_collaborator, course, "user" CASCADE`);
}

describe("course-authz pure", () => {
	it("admin gets owner access", () => {
		const access = getCourseAccessPure({
			userId: "u1",
			userRole: "admin",
			courseOwnerId: "u2",
			collaboratorRole: null,
		});
		expect(access.role).toBe("owner");
		expect(access.canEdit).toBe(true);
		expect(access.canPublish).toBe(true);
	});

	it("course owner gets owner access", () => {
		const access = getCourseAccessPure({
			userId: "u1",
			userRole: "user",
			courseOwnerId: "u1",
			collaboratorRole: null,
		});
		expect(access.role).toBe("owner");
		expect(access.canEdit).toBe(true);
	});

	it("instructor collaborator gets edit + publish access", () => {
		const access = getCourseAccessPure({
			userId: "u1",
			userRole: "user",
			courseOwnerId: "u2",
			collaboratorRole: "instructor",
		});
		expect(access.role).toBe("instructor");
		expect(access.canEdit).toBe(true);
		expect(access.canPublish).toBe(true);
	});

	it("editor collaborator gets edit but no publish", () => {
		const access = getCourseAccessPure({
			userId: "u1",
			userRole: "user",
			courseOwnerId: "u2",
			collaboratorRole: "editor",
		});
		expect(access.role).toBe("editor");
		expect(access.canEdit).toBe(true);
		expect(access.canPublish).toBe(false);
	});

	it("viewer collaborator gets no edit access", () => {
		const access = getCourseAccessPure({
			userId: "u1",
			userRole: "user",
			courseOwnerId: "u2",
			collaboratorRole: "viewer",
		});
		expect(access.role).toBe("viewer");
		expect(access.canEdit).toBe(false);
		expect(access.canPublish).toBe(false);
	});

	it("unrelated user gets none access", () => {
		const access = getCourseAccessPure({
			userId: "u1",
			userRole: "user",
			courseOwnerId: "u2",
			collaboratorRole: null,
		});
		expect(access.role).toBe("none");
		expect(access.canEdit).toBe(false);
	});

	it("canEditCoursePure returns correct boolean", () => {
		expect(
			canEditCoursePure({
				userId: "u1",
				userRole: "user",
				courseOwnerId: "u1",
				collaboratorRole: null,
			}),
		).toBe(true);
		expect(
			canEditCoursePure({
				userId: "u1",
				userRole: "user",
				courseOwnerId: "u2",
				collaboratorRole: null,
			}),
		).toBe(false);
		expect(
			canEditCoursePure({
				userId: "u1",
				userRole: "user",
				courseOwnerId: "u2",
				collaboratorRole: "editor",
			}),
		).toBe(true);
	});
});

describe("course-authz repo", () => {
	beforeEach(reset);

	it("getCourseOwnerId returns owner id", async () => {
		const ownerId = randomUUID();
		await db.insert(userTable).values({
			id: ownerId,
			email: "owner@test",
			name: "Owner",
			role: "user",
		});
		const [c] = await db
			.insert(course)
			.values({
				slug: "owner-course",
				title: "Owner Course",
				summary: "S",
				ownerUserId: ownerId,
				createdByUserId: ownerId,
			})
			.returning({ id: course.id });

		const result = await getCourseOwnerId(c!.id);
		expect(result).toBe(ownerId);
	});

	it("getCollaboratorRole returns role", async () => {
		const ownerId = randomUUID();
		const instructorId = randomUUID();
		await db.insert(userTable).values([
			{ id: ownerId, email: "owner@test", name: "Owner", role: "user" },
			{
				id: instructorId,
				email: "inst@test",
				name: "Instructor",
				role: "user",
			},
		]);

		const [c] = await db
			.insert(course)
			.values({
				slug: "collab-course",
				title: "Collab Course",
				summary: "S",
				ownerUserId: ownerId,
				createdByUserId: ownerId,
			})
			.returning({ id: course.id });

		await db.insert(courseCollaborator).values({
			courseId: c!.id,
			userId: instructorId,
			role: "instructor",
			grantedByUserId: ownerId,
		});

		const role = await getCollaboratorRole(c!.id, instructorId);
		expect(role).toBe("instructor");
	});
});
