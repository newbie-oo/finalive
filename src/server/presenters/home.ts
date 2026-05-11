import "server-only";
import { listFeaturedCourses } from "@/server/repos/course";
import { getPublicHomeStats } from "@/server/repos/stats";
import { coverImageUrl } from "@/lib/media-url";
import type { CourseCardData } from "@/components/course/course-card";
import type { PublicHomeStats } from "@/server/repos/stats";

export interface HomePageViewModel {
	featured: CourseCardData[];
	heroCourse: CourseCardData | null;
	stats: PublicHomeStats;
	formattedStudents: string;
	hasStats: boolean;
}

/**
 * Resolve the homepage view model.
 *
 * Orchestrates stats and featured-course fetches in parallel, maps cover
 * images, and pre-computes all view-derived strings so the page component
 * focuses purely on rendering.
 */
export async function resolveHomePage(): Promise<HomePageViewModel> {
	const [stats, featuredRaw] = await Promise.all([
		getPublicHomeStats(),
		listFeaturedCourses(3),
	]);

	const featured: CourseCardData[] = featuredRaw.map((c) => ({
		...c,
		coverImageUrl: coverImageUrl(c.coverStorageKey),
	}));

	const heroCourse = featured[0] ?? null;
	const formattedStudents =
		stats.activeStudents >= 100
			? `${stats.activeStudents.toLocaleString("en-US")}+`
			: stats.activeStudents.toLocaleString("en-US");
	const hasStats =
		stats.publishedCourses > 0 ||
		stats.activeStudents > 0 ||
		stats.publishedLessons > 0;

	return {
		featured,
		heroCourse,
		stats,
		formattedStudents,
		hasStats,
	};
}
