import { coverImageUrl } from "@/lib/media-url";
import {
	type StudentDashboardRaw,
	type StudentEnrollmentItemRaw,
	getStudentDashboardDataRaw,
} from "@/server/repos/student-dashboard";

export interface StudentEnrollmentItem extends StudentEnrollmentItemRaw {
	coverImageUrl: string | null;
}

export interface RecentActivityItem {
	type:
		| "lesson_complete"
		| "quiz_pass"
		| "quiz_fail"
		| "course_complete"
		| "enroll";
	title: string;
	meta?: string;
	at: Date;
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

/** Build view model from raw repo data. */
export function buildDashboardViewModel(raw: StudentDashboardRaw): {
	enrollments: StudentEnrollmentItem[];
	totalWatchedSeconds: number;
	weeklyWatchedSeconds: number;
	certCount: number;
	completedCourses: number;
	streak: number;
	heatmap: number[];
	recentActivity: RecentActivityItem[];
	achievements: AchievementItem[];
} {
	const enrollments = raw.enrollments.map((e) => ({
		...e,
		coverImageUrl: coverImageUrl(e.coverStorageKey),
	}));

	const streak = computeStreak(raw.streakDates);
	const heatmap = buildHeatmap(
		raw.heatmapDays,
		raw.heatStart,
		raw.heatMapByDate,
	);

	const achievements = buildAchievements(
		raw.certCount,
		streak,
		raw.totalDoneLessons,
		raw.quizPassCount,
	);

	return {
		enrollments,
		totalWatchedSeconds: raw.totalWatchedSeconds,
		weeklyWatchedSeconds: raw.weeklyWatchedSeconds,
		certCount: raw.certCount,
		completedCourses: raw.completedCourses,
		streak,
		heatmap,
		recentActivity: raw.recentActivity,
		achievements,
	};
}

/** Orchestrator: fetch raw data then build view model. */
export async function getStudentDashboard(userId: string) {
	const raw = await getStudentDashboardDataRaw(userId);
	return buildDashboardViewModel(raw);
}
