import { describe, it, expect, vi } from "vitest";
import { CurriculumAdminService } from "./curriculum-admin";
import type { CurriculumModule } from "@/server/repos/course";

vi.mock("server-only", () => ({}));

function makeCurriculum(
	mods: CurriculumModule[],
): () => Promise<CurriculumModule[]> {
	return vi.fn().mockResolvedValue(mods);
}

describe("CurriculumAdminService", () => {
	describe("computeNextModuleSortOrder", () => {
		it("returns 0 for empty course", async () => {
			const svc = new CurriculumAdminService({
				getCourseCurriculum: makeCurriculum([]),
			});
			expect(await svc.computeNextModuleSortOrder("c1")).toBe(0);
		});

		it("returns max+1 for non-empty course", async () => {
			const svc = new CurriculumAdminService({
				getCourseCurriculum: makeCurriculum([
					{ id: "m1", title: "A", sortOrder: 0, lessons: [] },
					{ id: "m2", title: "B", sortOrder: 5, lessons: [] },
				]),
			});
			expect(await svc.computeNextModuleSortOrder("c1")).toBe(6);
		});
	});

	describe("computeNextLessonSortOrder", () => {
		it("returns 0 when module has no lessons", async () => {
			const svc = new CurriculumAdminService({
				getCourseCurriculum: makeCurriculum([
					{ id: "m1", title: "A", sortOrder: 0, lessons: [] },
				]),
			});
			expect(await svc.computeNextLessonSortOrder("c1", "m1")).toBe(0);
		});

		it("returns max+1 for lessons in target module", async () => {
			const svc = new CurriculumAdminService({
				getCourseCurriculum: makeCurriculum([
					{
						id: "m1",
						title: "A",
						sortOrder: 0,
						lessons: [
							{
								id: "l1",
								title: "L1",
								durationSeconds: null,
								isPreview: false,
								isFree: false,
								sortOrder: 0,
							},
							{
								id: "l2",
								title: "L2",
								durationSeconds: null,
								isPreview: false,
								isFree: false,
								sortOrder: 3,
							},
						],
					},
				]),
			});
			expect(await svc.computeNextLessonSortOrder("c1", "m1")).toBe(4);
		});

		it("returns null when module not found in course", async () => {
			const svc = new CurriculumAdminService({
				getCourseCurriculum: makeCurriculum([]),
			});
			expect(
				await svc.computeNextLessonSortOrder("c1", "m-unknown"),
			).toBeNull();
		});
	});

	describe("verifyModuleInCourse", () => {
		it("succeeds when module is in course", async () => {
			const svc = new CurriculumAdminService({
				getCourseCurriculum: makeCurriculum([
					{ id: "m1", title: "A", sortOrder: 0, lessons: [] },
				]),
			});
			const result = await svc.verifyModuleInCourse("m1", "c1");
			expect(result).toEqual({ ok: true });
		});

		it("fails when module is not in course", async () => {
			const svc = new CurriculumAdminService({
				getCourseCurriculum: makeCurriculum([
					{ id: "m1", title: "A", sortOrder: 0, lessons: [] },
				]),
			});
			const result = await svc.verifyModuleInCourse("m2", "c1");
			expect(result).toEqual({ ok: false, error: "not_found" });
		});
	});

	describe("verifyLessonInCourse", () => {
		it("succeeds when lesson is in course", async () => {
			const svc = new CurriculumAdminService({
				getCourseCurriculum: makeCurriculum([
					{
						id: "m1",
						title: "A",
						sortOrder: 0,
						lessons: [
							{
								id: "l1",
								title: "L1",
								durationSeconds: null,
								isPreview: false,
								isFree: false,
								sortOrder: 0,
							},
						],
					},
				]),
			});
			const result = await svc.verifyLessonInCourse("l1", "c1");
			expect(result).toEqual({ ok: true });
		});

		it("fails when lesson is not in course", async () => {
			const svc = new CurriculumAdminService({
				getCourseCurriculum: makeCurriculum([
					{
						id: "m1",
						title: "A",
						sortOrder: 0,
						lessons: [
							{
								id: "l1",
								title: "L1",
								durationSeconds: null,
								isPreview: false,
								isFree: false,
								sortOrder: 0,
							},
						],
					},
				]),
			});
			const result = await svc.verifyLessonInCourse("l2", "c1");
			expect(result).toEqual({ ok: false, error: "not_found" });
		});
	});
});
