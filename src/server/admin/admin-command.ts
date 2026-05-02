import "server-only";
import { revalidatePath } from "next/cache";
import { getSession } from "@/server/auth-session";
import { canEditCourse } from "@/server/services/course-authz";
import { getAdminCourseById } from "@/server/repos/admin-course";
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

	const editable = await canEditCourse(
		session.user.id,
		session.user.role,
		courseId,
	);
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
