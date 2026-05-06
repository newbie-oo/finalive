import { coverImageUrl } from "@/lib/media-url";
import {
	type StudentEnrollmentItemRaw,
	StudentEnrollmentRepo,
} from "@/server/repos/student-enrollment";
import { WatchTimeRepo } from "@/server/repos/watch-time";
import { countByUserId as countCertificatesByUserId } from "@/server/repos/certificate";
import { StreakRepo } from "@/server/repos/streak";
import { HeatmapRepo } from "@/server/repos/heatmap";
import {
	type RecentActivityItem,
	StudentActivityRepo,
} from "@/server/repos/student-activity";

export interface StudentEnrollmentItem extends StudentEnrollmentItemRaw {
	coverImageUrl: string | null;
}

export interface AchievementItem {
	icon: "trophy" | "flame" | "books" | "check-circle" | "certificate";
	title: string;
	desc: string;
	color: string;
}

/** Compute streak from sorted distinct date strings. */
export function computeStreak(sortedDates: string[]): number {
	if (sortedDates.length === 0) return 0;

	const today = new Date();
	today.setHours(0, 0, 0, 0);

	const dates = sortedDates.map((d) => {
		const date = new Date(d);
		date.setHours(0, 0, 0, 0);
		return date.getTime();
	});

	const mostRecent = dates[0]!;
	const oneDay = 86400000;

	if (mostRecent < today.getTime() - oneDay) return 0;

	let streak = 1;
	for (let i = 1; i < dates.length; i++) {
		if (dates[i] === mostRecent - i * oneDay) {
			streak++;
		} else {
			break;
		}
	}
	return streak;
}

/** Bucket lesson counts into 0-4 intensity levels for the heatmap. */
export function buildHeatmap(
	days: number,
	start: Date,
	lessonsByDate: Map<string, number>,
): number[] {
	const heatmap: number[] = [];
	for (let i = 0; i < days; i++) {
		const d = new Date(start);
		d.setDate(start.getDate() + i);
		const key = d.toISOString().slice(0, 10);
		const lessons = lessonsByDate.get(key) ?? 0;
		if (lessons === 0) heatmap.push(0);
		else if (lessons === 1) heatmap.push(1);
		else if (lessons <= 3) heatmap.push(2);
		else if (lessons <= 5) heatmap.push(3);
		else heatmap.push(4);
	}
	return heatmap;
}

/** Build achievement list from raw stats. */
export function buildAchievements(
	certCount: number,
	streak: number,
	totalDoneLessons: number,
	quizPassCount: number,
): AchievementItem[] {
	const achievements: AchievementItem[] = [
		{
			icon: "certificate",
			title: "ใบประกาศนักบุกเบิก",
			desc: `${certCount} ใบประกาศแล้ว`,
			color: "var(--primary)",
		},
		{
			icon: "flame",
			title: `สตรีก ${streak} วัน`,
			desc: streak > 1 ? "เรียนต่อเนื่องทุกวัน" : "เริ่มต้นสตรีกของคุณ",
			color: "var(--accent)",
		},
		{
			icon: "books",
			title: "นักเรียนขยัน",
			desc: `จบ ${totalDoneLessons} บทเรียน`,
			color: "#10B981",
		},
	];

	if (quizPassCount > 0) {
		achievements.push({
			icon: "check-circle",
			title: "Quiz Master",
			desc: `ผ่านแบบทดสอบ ${quizPassCount} ครั้ง`,
			color: "#8B5CF6",
		});
	}

	return achievements;
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
	] = await Promise.all([
		StudentEnrollmentRepo.listWithProgress(userId),
		WatchTimeRepo.getTotal(userId),
		WatchTimeRepo.getWeekly(userId),
		countCertificatesByUserId(userId),
		StreakRepo.getDates(userId),
		HeatmapRepo.getData(userId, 35),
		StudentActivityRepo.getRecent(userId),
	]);

	const enrollments = enrollmentsRaw.map((e) => ({
		...e,
		coverImageUrl: coverImageUrl(e.coverStorageKey),
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
	};
}
