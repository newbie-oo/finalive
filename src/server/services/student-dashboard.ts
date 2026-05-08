import { coverImageUrl } from "@/lib/media-url";
import {
	type StudentEnrollmentItemRaw,
	StudentEnrollmentRepo,
} from "@/server/repos/student-enrollment";
import { WatchTimeRepo } from "@/server/repos/watch-time";
import { countByUserId as countCertificatesByUserId } from "@/server/repos/certificate";
import { StreakRepo } from "@/server/repos/streak";
import { HeatmapRepo } from "@/server/repos/heatmap";
import { StudentActivityRepo } from "@/server/repos/student-activity";
import { UpNextRepo, type UpNextItem } from "@/server/repos/up-next";
import {
	type AchievementItem,
	computeStreak,
	buildHeatmap,
	buildAchievements,
} from "@/server/services/dashboard-view-model";

export type { AchievementItem };

export interface StudentEnrollmentItem extends StudentEnrollmentItemRaw {
	coverImageUrl: string | null;
}

export interface UpNextEntry extends UpNextItem {
	coverImageUrl: string | null;
}

/** Orchestrator: fetch raw data from focused repos then build view model. */
export async function getStudentDashboard(userId: string) {
	const [
		enrollmentsRaw,
		totalWatchedSeconds,
		weeklyWatchedSeconds,
		certCount,
		streakDates,
		heatMapByDate,
		recentActivity,
		upNextRaw,
	] = await Promise.all([
		StudentEnrollmentRepo.listWithProgress(userId),
		WatchTimeRepo.getTotal(userId),
		WatchTimeRepo.getWeekly(userId),
		countCertificatesByUserId(userId),
		StreakRepo.getDates(userId),
		HeatmapRepo.getData(userId, 35),
		StudentActivityRepo.getRecent(userId),
		UpNextRepo.listForUser(userId, 3),
	]);

	const enrollments = enrollmentsRaw.map((e) => ({
		...e,
		coverImageUrl: coverImageUrl(e.coverStorageKey),
	}));
	const upNext: UpNextEntry[] = upNextRaw.map((u) => ({
		...u,
		coverImageUrl: coverImageUrl(u.coverStorageKey),
	}));

	const completedCourses = enrollments.filter((e) => e.completedAt).length;
	const totalDoneLessons = enrollments.reduce(
		(sum, e) => sum + e.doneLessons,
		0,
	);

	const streak = computeStreak(streakDates);

	const heatStart = new Date();
	heatStart.setDate(heatStart.getDate() - 35 + 1);
	heatStart.setHours(0, 0, 0, 0);
	const heatmap = buildHeatmap(35, heatStart, heatMapByDate);

	const quizPassCount = recentActivity.filter(
		(a) => a.type === "quiz_pass",
	).length;

	const achievements = buildAchievements(
		certCount,
		streak,
		totalDoneLessons,
		quizPassCount,
	);

	return {
		enrollments,
		totalWatchedSeconds,
		weeklyWatchedSeconds,
		certCount,
		completedCourses,
		streak,
		heatmap,
		recentActivity,
		achievements,
		upNext,
	};
}
