import "server-only";
import { CourseCompletionService } from "./course-completion";
import { certificateIssuerFactory } from "./certificate-factory";
import { markLessonComplete } from "@/server/repos/progress";
import { checkAndMarkCourseComplete } from "@/server/repos/learn-completion";
import { getCourseIdByLessonId } from "@/server/repos/course";

/**
 * Factory for the real CourseCompletionService adapter.
 * Wires production repos and infrastructure behind the service seam.
 */
export function makeCourseCompletionService(): CourseCompletionService {
	return new CourseCompletionService({
		markLessonComplete,
		getCourseIdByLessonId,
		checkAndMarkCourseComplete,
		certificateIssuer: certificateIssuerFactory(),
	});
}
