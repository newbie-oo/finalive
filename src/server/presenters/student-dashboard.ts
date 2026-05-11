import "server-only";
import { getStudentDashboard } from "@/server/services/student-dashboard";
import { formatDurationAuto, type FormattedDuration } from "@/lib/format";
import type {
	StudentEnrollmentItem,
	UpNextEntry,
	AchievementItem,
} from "@/server/services/student-dashboard";

export interface InProgressEnrollment extends StudentEnrollmentItem {
	progressPct: number;
}

export interface StudentDashboardViewModel {
	enrollments: StudentEnrollmentItem[];
	inProgress: InProgressEnrollment[];
	continueCourse: StudentEnrollmentItem | undefined;
	watchedDuration: FormattedDuration;
	isNewStudent: boolean;
	firstName: string | null;
	certCount: number;
	streak: number;
	heatmap: Awaited<ReturnType<typeof getStudentDashboard>>["heatmap"];
	heatmapStart: Date;
	recentActivity: Awaited<
		ReturnType<typeof getStudentDashboard>
	>["recentActivity"];
	achievements: AchievementItem[];
	upNext: UpNextEntry[];
}

/**
 * Resolve the student dashboard page view model.
 *
 * - Fetches all dashboard data through the service orchestrator.
 * - Computes presentation values (progress percentage, duration formatting,
 *   first-name extraction, new-student flag) in one place.
 * - Returns a plain object so the page component focuses purely on rendering.
 */
export async function resolveStudentDashboardPage(
	userId: string,
	userName: string | null | undefined,
): Promise<StudentDashboardViewModel> {
	const data = await getStudentDashboard(userId);

	const inProgress: InProgressEnrollment[] = data.enrollments
		.filter((e) => !e.completedAt)
		.map((e) => ({
			...e,
			progressPct:
				e.totalLessons > 0
					? Math.round((e.doneLessons / e.totalLessons) * 100)
					: 0,
		}));

	const continueCourse = inProgress[0];
	const watchedDuration = formatDurationAuto(data.totalWatchedSeconds);
	const isNewStudent = data.enrollments.length === 0;
	const firstName = userName?.split(/\s+/)[0] ?? null;

	return {
		enrollments: data.enrollments,
		inProgress,
		continueCourse,
		watchedDuration,
		isNewStudent,
		firstName,
		certCount: data.certCount,
		streak: data.streak,
		heatmap: data.heatmap,
		heatmapStart: data.heatmapStart,
		recentActivity: data.recentActivity,
		achievements: data.achievements,
		upNext: data.upNext,
	};
}
