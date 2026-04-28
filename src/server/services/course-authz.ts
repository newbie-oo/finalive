import "server-only";
import { eq, and } from "drizzle-orm";
import { db } from "@/db/client";
import { course, courseCollaborator } from "@/db/schema/course";

export type CourseRole = "owner" | "instructor" | "editor" | "viewer" | "none";

export interface CourseAccess {
  role: CourseRole;
  canEdit: boolean;
  canPublish: boolean;
}

export async function getCourseAccess(
  userId: string,
  userRole: string,
  courseId: string,
): Promise<CourseAccess> {
  // Admin has full access to everything.
  if (userRole === "admin") {
    return { role: "owner", canEdit: true, canPublish: true };
  }

  // Check if user is the course owner.
  const courseRows = await db
    .select({ ownerUserId: course.ownerUserId })
    .from(course)
    .where(eq(course.id, courseId))
    .limit(1);

  const ownerId = courseRows[0]?.ownerUserId;
  if (ownerId === userId) {
    return { role: "owner", canEdit: true, canPublish: true };
  }

  // Check collaborator role.
  const collabRows = await db
    .select({ role: courseCollaborator.role })
    .from(courseCollaborator)
    .where(and(eq(courseCollaborator.courseId, courseId), eq(courseCollaborator.userId, userId)))
    .limit(1);

  const collabRole = collabRows[0]?.role;
  if (collabRole === "instructor" || collabRole === "editor") {
    return { role: collabRole as CourseRole, canEdit: true, canPublish: collabRole === "instructor" };
  }
  if (collabRole === "viewer") {
    return { role: "viewer", canEdit: false, canPublish: false };
  }

  return { role: "none", canEdit: false, canPublish: false };
}

export async function canEditCourse(
  userId: string,
  userRole: string,
  courseId: string,
): Promise<boolean> {
  const access = await getCourseAccess(userId, userRole, courseId);
  return access.canEdit;
}
