import "server-only";
import type { CurriculumModule } from "@/server/repos/course";

export interface CurriculumAdminDeps {
	getCourseCurriculum: (courseId: string) => Promise<CurriculumModule[]>;
}

export interface SortOrderResult {
	nextSortOrder: number;
}

export interface VerifyResult {
	ok: true;
}

export interface VerifyError {
	ok: false;
	error: "not_found" | "forbidden";
}

/**
 * Pure domain helpers for curriculum administration: sort-order computation
 * and ownership verification. No DB writes — those stay in actions/repos.
 */
export class CurriculumAdminService {
	constructor(private deps: CurriculumAdminDeps) {}

	/** Compute the next available sortOrder for a new module in a course. */
	async computeNextModuleSortOrder(courseId: string): Promise<number> {
		const curriculum = await this.deps.getCourseCurriculum(courseId);
		if (curriculum.length === 0) return 0;
		return Math.max(...curriculum.map((m) => m.sortOrder)) + 1;
	}

	/** Compute the next available sortOrder for a new lesson in a module. */
	async computeNextLessonSortOrder(
		courseId: string,
		moduleId: string,
	): Promise<number | null> {
		const curriculum = await this.deps.getCourseCurriculum(courseId);
		const targetModule = curriculum.find((m) => m.id === moduleId);
		if (!targetModule) return null;
		if (targetModule.lessons.length === 0) return 0;
		return Math.max(...targetModule.lessons.map((l) => l.sortOrder)) + 1;
	}

	/** Verify a module belongs to the given course. */
	async verifyModuleInCourse(
		moduleId: string,
		courseId: string,
	): Promise<VerifyResult | VerifyError> {
		const curriculum = await this.deps.getCourseCurriculum(courseId);
		return curriculum.some((m) => m.id === moduleId)
			? { ok: true }
			: { ok: false, error: "not_found" };
	}

	/** Verify a lesson belongs to the given course (via its module). */
	async verifyLessonInCourse(
		lessonId: string,
		courseId: string,
	): Promise<VerifyResult | VerifyError> {
		const curriculum = await this.deps.getCourseCurriculum(courseId);
		for (const mod of curriculum) {
			if (mod.lessons.some((l) => l.id === lessonId)) {
				return { ok: true };
			}
		}
		return { ok: false, error: "not_found" };
	}
}
