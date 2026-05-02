import { describe, it, expect, beforeEach } from "vitest";
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@/db/client";
import { course, courseCollaborator } from "@/db/schema/course";
import { user as userTable } from "@/db/schema/auth";
import { getCourseAccess, canEditCourse } from "@/server/services/course-authz";

async function reset() {
  await db.execute(sql`TRUNCATE course_collaborator, course, "user" CASCADE`);
}

describe("course-authz", () => {
  beforeEach(reset);

  it("admin gets owner access", async () => {
    const access = await getCourseAccess("any-id", "admin", randomUUID());
    expect(access.role).toBe("owner");
    expect(access.canEdit).toBe(true);
    expect(access.canPublish).toBe(true);
  });

  it("course owner gets owner access", async () => {
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

    const access = await getCourseAccess(ownerId, "user", c!.id);
    expect(access.role).toBe("owner");
    expect(access.canEdit).toBe(true);
  });

  it("instructor collaborator gets edit + publish access", async () => {
    const ownerId = randomUUID();
    const instructorId = randomUUID();
    await db.insert(userTable).values([
      { id: ownerId, email: "owner@test", name: "Owner", role: "user" },
      { id: instructorId, email: "inst@test", name: "Instructor", role: "user" },
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

    const access = await getCourseAccess(instructorId, "user", c!.id);
    expect(access.role).toBe("instructor");
    expect(access.canEdit).toBe(true);
    expect(access.canPublish).toBe(true);
  });

  it("viewer collaborator gets no edit access", async () => {
    const ownerId = randomUUID();
    const viewerId = randomUUID();
    await db.insert(userTable).values([
      { id: ownerId, email: "owner@test", name: "Owner", role: "user" },
      { id: viewerId, email: "viewer@test", name: "Viewer", role: "user" },
    ]);

    const [c] = await db
      .insert(course)
      .values({
        slug: "view-course",
        title: "View Course",
        summary: "S",
        ownerUserId: ownerId,
        createdByUserId: ownerId,
      })
      .returning({ id: course.id });

    await db.insert(courseCollaborator).values({
      courseId: c!.id,
      userId: viewerId,
      role: "viewer",
      grantedByUserId: ownerId,
    });

    const access = await getCourseAccess(viewerId, "user", c!.id);
    expect(access.role).toBe("viewer");
    expect(access.canEdit).toBe(false);
    expect(access.canPublish).toBe(false);
  });

  it("unrelated user gets none access", async () => {
    const ownerId = randomUUID();
    const otherId = randomUUID();
    await db.insert(userTable).values([
      { id: ownerId, email: "owner@test", name: "Owner", role: "user" },
      { id: otherId, email: "other@test", name: "Other", role: "user" },
    ]);

    const [c] = await db
      .insert(course)
      .values({
        slug: "other-course",
        title: "Other Course",
        summary: "S",
        ownerUserId: ownerId,
        createdByUserId: ownerId,
      })
      .returning({ id: course.id });

    const access = await getCourseAccess(otherId, "user", c!.id);
    expect(access.role).toBe("none");
    expect(access.canEdit).toBe(false);
  });

  it("canEditCourse returns correct boolean", async () => {
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
        slug: "edit-course",
        title: "Edit Course",
        summary: "S",
        ownerUserId: ownerId,
        createdByUserId: ownerId,
      })
      .returning({ id: course.id });

    expect(await canEditCourse(ownerId, "user", c!.id)).toBe(true);
    expect(await canEditCourse(randomUUID(), "user", c!.id)).toBe(false);
  });
});
