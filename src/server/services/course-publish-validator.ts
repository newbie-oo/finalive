import {
	isPlaceholderBody,
	isInsufficientBody,
} from "@/server/lib/lesson-content";
import type { CurriculumModule } from "@/server/repos/curriculum-repo";

export interface LessonRow {
	id: string;
	title: string;
	bodyMd: string | null;
	videoMediaId: string | null;
}

export interface CoursePublishValidatorDeps {
	/** Course metadata from the repo. */
	getCourseMeta: (courseId: string) => Promise<{
		title: string;
		summary: string;
	} | null>;
	/** Full curriculum for the course. */
	getCurriculum: (courseId: string) => Promise<CurriculumModule[]>;
	/** All non-deleted lessons in the course with their content. */
	getLessons: (courseId: string) => Promise<LessonRow[]>;
}

export interface PublishValidationResult {
	ok: true;
}

export interface PublishValidationError {
	ok: false;
	errors: string[];
}

/**
 * Validates whether a course is ready to be published.
 * Pure domain logic — all data is injected so tests can fake deps.
 */
export class CoursePublishValidator {
	constructor(private deps: CoursePublishValidatorDeps) {}

	async validate(
		courseId: string,
	): Promise<PublishValidationResult | PublishValidationError> {
		const errors: string[] = [];

		const meta = await this.deps.getCourseMeta(courseId);
		if (!meta) {
			return { ok: false, errors: ["course not found"] };
		}

		if (!meta.title.trim()) errors.push("ชื่อคอร์สว่างเปล่า");
		if (!meta.summary.trim()) errors.push("คำอธิบายคอร์สว่างเปล่า");

		const curriculum = await this.deps.getCurriculum(courseId);
		if (curriculum.length === 0) errors.push("ยังไม่มีโมดูล");

		const totalLessons = curriculum.reduce(
			(sum, m) => sum + m.lessons.length,
			0,
		);
		if (totalLessons === 0) errors.push("ยังไม่มีบทเรียน");

		if (totalLessons > 0) {
			const lessonRows = await this.deps.getLessons(courseId);
			for (const ls of lessonRows) {
				if (isPlaceholderBody(ls.bodyMd)) {
					errors.push(`บทเรียน "${ls.title}" ยังเป็นเนื้อหา placeholder จาก seed`);
					continue;
				}
				if (!ls.videoMediaId && isInsufficientBody(ls.bodyMd)) {
					errors.push(`บทเรียน "${ls.title}" เนื้อหาว่างหรือสั้นเกินไป`);
				}
			}
		}

		if (errors.length > 0) {
			return { ok: false, errors };
		}
		return { ok: true };
	}
}
