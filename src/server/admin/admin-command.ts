import "server-only";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { getSession } from "@/server/auth-session";
import { canEditCoursePure } from "@/server/services/course-authz";
import { getAdminCourseById } from "@/server/repos/admin-course";
import { db } from "@/db/client";
import { courseCollaborator } from "@/db/schema/course";
import type { SessionContext } from "@/server/auth-session";

export type AdminResult<T> =
  | { ok: true; session: SessionContext; data: T }
  | {
      ok: false;
      error: "unauthorized" | "forbidden" | "not_found" | "invalid_input";
    };

export async function requireAdminSession(): Promise<
  { ok: true; session: SessionContext } | { ok: false; error: "unauthorized" }
> {
  const session = await getSession();
  if (!session?.user?.id) {
    return { ok: false, error: "unauthorized" };
  }
  return { ok: true, session };
}

export async function requireCourseAccess(
  session: SessionContext,
  courseId: string,
): Promise<
  | {
      ok: true;
      course: NonNullable<Awaited<ReturnType<typeof getAdminCourseById>>>;
    }
  | { ok: false; error: "not_found" | "forbidden" }
> {
  const course = await getAdminCourseById(courseId);
  if (!course) {
    return { ok: false, error: "not_found" };
  }

  // Load only this user's collaborator role (if any) — avoids the double
  // course query that canEditCourse(getCourseAccess) would do.
  const collabRows = await db
    .select({ role: courseCollaborator.role })
    .from(courseCollaborator)
    .where(
      and(
        eq(courseCollaborator.courseId, courseId),
        eq(courseCollaborator.userId, session.user.id),
      ),
    )
    .limit(1);

  const editable = canEditCoursePure({
    userId: session.user.id,
    userRole: session.user.role,
    courseOwnerId: course.ownerUserId,
    collaboratorRole: collabRows[0]?.role ?? null,
  });

  if (!editable) {
    return { ok: false, error: "forbidden" };
  }

  return { ok: true, course };
}

export function revalidateCourseAdminPaths(
  courseId: string,
  slug?: string | null,
): void {
  revalidatePath("/admin/courses");
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath(`/admin/courses/${courseId}/curriculum`);
  if (slug) {
    revalidatePath(`/courses/${slug}`);
    revalidatePath("/courses");
  }
}
