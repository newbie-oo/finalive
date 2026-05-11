import "server-only";
import { AdminStatsRepo } from "@/server/repos/admin-stats";
import { RevenueRepo } from "@/server/repos/revenue";
import { ActivityRepo } from "@/server/repos/activity";
import {
	formatActivityRows,
	formatMonthlyRevenue,
} from "@/server/services/admin-dashboard-presenter";
import { listPendingSlips } from "@/server/repos/slip";
import { thaiDateString, thaiTimeString } from "@/lib/format-time";
import type {
	ActivityRow,
	MonthlyRevenue,
} from "@/server/services/admin-dashboard-presenter";
import type { AdminDashboardCounts } from "@/server/repos/admin-stats";

export interface KpiDelta {
	value: number;
	label?: string;
}

export interface PendingSlipPreview {
	id: string;
	studentName: string | null;
	expectedAmount: string;
	courseTitle: string | null;
}

export interface AdminDashboardViewModel {
	nowLabel: string;
	counts: AdminDashboardCounts;
	revenueDelta: KpiDelta | undefined;
	revenueData: MonthlyRevenue[];
	topCourses: Awaited<ReturnType<typeof RevenueRepo.getTopCoursesByEnrollment>>;
	maxEnroll: number;
	pendingSlips: PendingSlipPreview[];
	activityRows: ActivityRow[];
}

/**
 * Orchestrate all data fetches for the admin dashboard and build the
 * view model in one place. The page component receives a plain object
 * and focuses purely on rendering.
 */
export async function getAdminDashboard(): Promise<AdminDashboardViewModel> {
	const [counts, topCourses, slipsRes, rawRevenue, rawActivity] =
		await Promise.all([
			AdminStatsRepo.getCounts(),
			RevenueRepo.getTopCoursesByEnrollment(4),
			listPendingSlips({ status: "submitted", per_page: 5 }),
			RevenueRepo.getMonthlyRevenue(),
			ActivityRepo.getRecent(6),
		]);

	const revenueData = formatMonthlyRevenue(rawRevenue);
	const activityRows = formatActivityRows(rawActivity);
	const maxEnroll = topCourses[0]?.enrollmentCount ?? 1;

	const lastMonth = revenueData[revenueData.length - 1];
	const revenueDelta: KpiDelta | undefined =
		lastMonth && lastMonth.previous > 0
			? {
					value:
						((lastMonth.current - lastMonth.previous) / lastMonth.previous) *
						100,
					label: "YoY",
				}
			: undefined;

	return {
		nowLabel: `${thaiDateString(new Date())} · ${thaiTimeString(new Date())}`,
		counts,
		revenueDelta,
		revenueData,
		topCourses,
		maxEnroll,
		pendingSlips: slipsRes.data.map((s) => ({
			id: s.id,
			studentName: s.studentName,
			expectedAmount: s.expectedAmount,
			courseTitle: s.courseTitle,
		})),
		activityRows,
	};
}
