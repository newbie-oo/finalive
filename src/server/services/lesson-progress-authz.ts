import "server-only";
import { ApiError } from "@/lib/api-error";
import { isAdmin } from "@/lib/auth-utils";
import {
	getLessonAccessRow,
	type LessonAccessRow,
} from "@/server/repos/lesson-access";
import { EnrollmentRepo } from "@/server/repos/enrollment";
import { checkLessonAccess } from "@/server/services/learn-access";

interface ProgressWriteAuthInput {
	userId: string;
	userRole: string | null | undefined;
	lessonId: string;
}

interface ProgressWriteAuthLookups {
	getLessonAccess: (lessonId: string) => Promise<LessonAccessRow | null>;
	hasActiveEnrollment: (userId: string, courseId: string) => Promise<boolean>;
}

const defaultLookups: ProgressWriteAuthLookups = {
	getLessonAccess: getLessonAccessRow,
	hasActiveEnrollment: (userId, courseId) =>
		EnrollmentRepo.hasActive(userId, courseId),
};

/**
 * Authorize a server-side progress write against `lessonId`:
 * throws `ApiError("not_found")` if the lesson is missing, and
 * `ApiError("forbidden")` if the caller is not entitled to consume it.
 *
 * Admins bypass both checks; the previous /api/learn/progress and /start
 * routes only short-circuited the admin case and accepted any lesson id
 * for any authenticated user — this closes that gap without changing the
 * existing access truth-table (see `checkLessonAccess`).
 *
 * `lookups` is injected for unit tests; production callers pass nothing.
 */
export async function assertCanWriteLessonProgress(
	input: ProgressWriteAuthInput,
	lookups: ProgressWriteAuthLookups = defaultLookups,
): Promise<void> {
	const access = await lookups.getLessonAccess(input.lessonId);
	if (!access) throw new ApiError("not_found", "lesson not found");

	const admin = isAdmin({ role: input.userRole ?? null });
	const enrolled = admin
		? false
		: await lookups.hasActiveEnrollment(input.userId, access.courseId);

	const result = checkLessonAccess({
		lesson: { isPreview: access.lessonIsPreview, isFree: access.lessonIsFree },
		course: { isFree: access.courseIsFree },
		isEnrolled: enrolled,
		isAuthenticated: true,
		isAdmin: admin,
	});

	if (!result.ok) {
		throw new ApiError("forbidden", "lesson not accessible");
	}
}
