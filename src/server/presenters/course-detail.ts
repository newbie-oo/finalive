import "server-only";
import {
	Clock,
	Certificate as CertificateIcon,
	Video,
	ChatCircle,
} from "@phosphor-icons/react/dist/ssr";
import {
	getPublishedCourseBySlug,
	getCourseCurriculum,
} from "@/server/repos/course";
import { EnrollmentRepo } from "@/server/repos/enrollment";
import { formatTHB, formatCourseDuration } from "@/lib/format";
import type {
	CurriculumModule,
	CurriculumLesson,
} from "@/server/repos/curriculum-repo";
import type { PublicCourseSummary } from "@/server/repos/course";

export interface FeaturePill {
	icon: typeof Video;
	label: string;
}

export interface CourseDetailViewModel {
	course: PublicCourseSummary;
	curriculum: CurriculumModule[];
	isEnrolled: boolean;
	totalLessons: number;
	totalDuration: number;
	isFreeView: boolean;
	price: string;
	firstPreviewLesson: CurriculumLesson | undefined;
	previewHref: string | null;
	isBestseller: boolean;
	durationHours: string | null;
	lastUpdated: string | null;
	featurePills: FeaturePill[];
}

/**
 * Resolve the course detail page view model.
 *
 * - Fetches course by slug (with unpublished visibility for admins).
 * - Checks active enrollment when a user is signed in.
 * - Builds curriculum, computes aggregates, and derives display values.
 * - Returns `null` when the course does not exist.
 */
export async function resolveCourseDetailPage(
	slug: string,
	userId: string | null,
	isAdmin: boolean,
): Promise<CourseDetailViewModel | null> {
	const course = await getPublishedCourseBySlug(slug, {
		includeUnpublished: isAdmin,
	});
	if (!course) return null;

	const [isEnrolled, curriculum] = await Promise.all([
		userId
			? EnrollmentRepo.hasActive(userId, course.id)
			: Promise.resolve(false),
		getCourseCurriculum(course.id, { includeEmptyModules: false }),
	]);

	const totalLessons = curriculum.reduce((sum, m) => sum + m.lessons.length, 0);
	const totalDuration = curriculum.reduce(
		(sum, m) =>
			sum + m.lessons.reduce((s, l) => s + (l.durationSeconds ?? 0), 0),
		0,
	);

	// Defensive: render free if either flag set OR price is literally 0 — keeps
	// the page UX correct even if a stray row escaped the create/update invariant.
	const isFreeView = course.isFree || Number(course.price) === 0;
	const price = isFreeView ? "ฟรี" : formatTHB(course.price);

	const firstPreviewLesson = curriculum
		.flatMap((m) => m.lessons)
		.find((l) => l.isPreview || l.isFree);

	const previewHref = firstPreviewLesson
		? `/courses/${course.slug}/preview/${firstPreviewLesson.id}`
		: null;

	const isBestseller = course.enrollmentCount >= 100;
	const durationHours = formatCourseDuration(totalDuration);
	const lastUpdated = course.publishedAt
		? course.publishedAt.toLocaleDateString("th-TH", {
				year: "numeric",
				month: "short",
			})
		: null;

	const featurePills: FeaturePill[] = [
		{ icon: Video, label: `${totalLessons} บทเรียน` },
		...(durationHours ? [{ icon: Clock, label: durationHours }] : []),
		{ icon: CertificateIcon, label: "ใบประกาศ" },
		{ icon: ChatCircle, label: "Q&A กับผู้สอน" },
	];

	return {
		course,
		curriculum,
		isEnrolled,
		totalLessons,
		totalDuration,
		isFreeView,
		price,
		firstPreviewLesson,
		previewHref,
		isBestseller,
		durationHours,
		lastUpdated,
		featurePills,
	};
}
