import {
	listAdminCourses,
	type AdminCourseListItem,
} from "@/server/repos/admin-course";
import { COURSE_STATUS, type CourseStatusFilter } from "@/db/schema/course";

export interface AdminCourseListViewModel {
	courses: AdminCourseListItem[];
	q: string;
	status: CourseStatusFilter;
	filtersActive: boolean;
}

/**
 * Parse search params and resolve the admin course list view model.
 * Keeps the page thin: all param validation + repo orchestration lives here.
 */
export async function resolveAdminCourseList(
	searchParams: Record<string, string | string[] | undefined> | undefined,
): Promise<AdminCourseListViewModel> {
	const sp = searchParams ?? {};
	const q = typeof sp.q === "string" ? sp.q : "";
	const statusParam = typeof sp.status === "string" ? sp.status : "all";
	const status: CourseStatusFilter = (
		COURSE_STATUS as readonly string[]
	).includes(statusParam)
		? (statusParam as CourseStatusFilter)
		: "all";

	const courses = await listAdminCourses({ q, status });
	const filtersActive = q.length > 0 || status !== "all";

	return { courses, q, status, filtersActive };
}
