import { notFound, redirect } from "next/navigation";
import { buildHlsUrl } from "@/server/services/bunny";
import { LessonContent } from "@/components/learn/lesson-content";
import { getSession } from "@/server/auth-session";
import { getLearnCourse, getLearnLesson } from "@/server/repos/learn";
import { getQuizByLessonId } from "@/server/repos/quiz";
import { checkLessonAccess } from "@/server/services/learn-access";
import { isAdmin as isAdminRole } from "@/lib/auth-utils";

export const dynamic = "force-dynamic";

export default async function LearnLessonPage({
	params,
}: {
	params: Promise<{ courseSlug: string; lessonId: string }>;
}) {
	const { courseSlug, lessonId } = await params;
	const session = await getSession();
	const userId = session?.user?.id ?? null;
	const isAdmin = isAdminRole(session?.user);

	const [courseData, lessonData, quizMeta] = await Promise.all([
		getLearnCourse(courseSlug, userId, { allowUnpublished: isAdmin }),
		getLearnLesson(courseSlug, lessonId, { allowUnpublished: isAdmin }),
		getQuizByLessonId(lessonId),
	]);

	if (!courseData || !lessonData) notFound();
	const access = checkLessonAccess({
		lesson: { isPreview: lessonData.isPreview, isFree: lessonData.isFree },
		course: { isFree: courseData.course.isFree },
		isEnrolled: courseData.isEnrolled,
		isAuthenticated: userId !== null,
		isAdmin,
	});

	if (!access.ok) {
		if (access.reason === "login_required") {
			redirect(
				`/login?next=${encodeURIComponent(`/learn/${courseSlug}/${lessonId}`)}`,
			);
		}
		redirect(`/courses/${courseSlug}`);
	}

	const totalLessons = courseData.modules.reduce(
		(acc, m) => acc + m.lessons.length,
		0,
	);
	const doneLessons = courseData.progress.filter(
		(p) => p.status === "completed",
	).length;
	const currentProgress = courseData.progress.find(
		(p) => p.lessonId === lessonId,
	);
	const watchedSeconds = currentProgress?.watchedSeconds ?? 0;
	const isCompleted = currentProgress?.status === "completed";

	return (
		<LessonContent
			key={lessonId}
			courseSlug={courseSlug}
			courseTitle={lessonData.courseTitle}
			lessonId={lessonData.id}
			lessonTitle={lessonData.title}
			moduleTitle={lessonData.moduleTitle}
			lessonBodyMd={lessonData.bodyMd}
			durationSeconds={lessonData.durationSeconds}
			nextLessonId={lessonData.nextLessonId}
			prevLessonId={lessonData.prevLessonId}
			quizId={quizMeta?.id ?? null}
			totalLessons={totalLessons}
			doneLessons={doneLessons}
			watchedSeconds={watchedSeconds}
			hlsUrl={
				lessonData.bunnyVideoId
					? buildHlsUrl({ videoId: lessonData.bunnyVideoId })
					: null
			}
			isAdmin={isAdmin}
			isCompleted={isCompleted}
		/>
	);
}
