import { describe, it, expect, vi } from "vitest";
import { createCurriculumAdminService } from "./curriculum-admin";
import type { CurriculumModule } from "@/server/repos/course";

vi.mock("server-only", () => ({}));

function makeCurriculum(
	mods: CurriculumModule[],
): () => Promise<CurriculumModule[]> {
	return vi.fn().mockResolvedValue(mods);
}

function fakeDeps(overrides?: {
	getCourseCurriculum?: () => Promise<CurriculumModule[]>;
}) {
	return {
		getCourseCurriculum: overrides?.getCourseCurriculum ?? makeCurriculum([]),
		createAdminModule: vi.fn().mockResolvedValue("mod-1"),
		createAdminLesson: vi.fn().mockResolvedValue("lesson-1"),
		updateAdminModule: vi.fn().mockResolvedValue(undefined),
		updateAdminLesson: vi.fn().mockResolvedValue(undefined),
		deleteAdminModule: vi.fn().mockResolvedValue(undefined),
		deleteAdminLesson: vi.fn().mockResolvedValue(undefined),
		reorderAdminModules: vi.fn().mockResolvedValue(undefined),
		reorderAdminLessons: vi.fn().mockResolvedValue(undefined),
	};
}

describe("CurriculumAdminService", () => {
	describe("computeNextModuleSortOrder", () => {
		it("returns 0 for empty course", async () => {
			const svc = createCurriculumAdminService(fakeDeps());
			expect(await svc.computeNextModuleSortOrder("c1")).toBe(0);
		});

		it("returns max+1 for non-empty course", async () => {
			const svc = createCurriculumAdminService(
				fakeDeps({
					getCourseCurriculum: makeCurriculum([
						{ id: "m1", title: "A", sortOrder: 0, lessons: [] },
						{ id: "m2", title: "B", sortOrder: 5, lessons: [] },
					]),
				}),
			);
			expect(await svc.computeNextModuleSortOrder("c1")).toBe(6);
		});
	});

	describe("computeNextLessonSortOrder", () => {
		it("returns 0 when module has no lessons", async () => {
			const svc = createCurriculumAdminService(
				fakeDeps({
					getCourseCurriculum: makeCurriculum([
						{ id: "m1", title: "A", sortOrder: 0, lessons: [] },
					]),
				}),
			);
			expect(await svc.computeNextLessonSortOrder("c1", "m1")).toBe(0);
		});

		it("returns max+1 for lessons in target module", async () => {
			const svc = createCurriculumAdminService(
				fakeDeps({
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
				}),
			);
			expect(await svc.computeNextLessonSortOrder("c1", "m1")).toBe(4);
		});

		it("returns null when module not found in course", async () => {
			const svc = createCurriculumAdminService(fakeDeps());
			expect(
				await svc.computeNextLessonSortOrder("c1", "m-unknown"),
			).toBeNull();
		});
	});

	describe("verifyModuleInCourse", () => {
		it("succeeds when module is in course", async () => {
			const svc = createCurriculumAdminService(
				fakeDeps({
					getCourseCurriculum: makeCurriculum([
						{ id: "m1", title: "A", sortOrder: 0, lessons: [] },
					]),
				}),
			);
			const result = await svc.verifyModuleInCourse("m1", "c1");
			expect(result).toEqual({ ok: true });
		});

		it("fails when module is not in course", async () => {
			const svc = createCurriculumAdminService(
				fakeDeps({
					getCourseCurriculum: makeCurriculum([
						{ id: "m1", title: "A", sortOrder: 0, lessons: [] },
					]),
				}),
			);
			const result = await svc.verifyModuleInCourse("m2", "c1");
			expect(result).toEqual({ ok: false, error: "not_found" });
		});
	});

	describe("verifyLessonInCourse", () => {
		it("succeeds when lesson is in course", async () => {
			const svc = createCurriculumAdminService(
				fakeDeps({
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
				}),
			);
			const result = await svc.verifyLessonInCourse("l1", "c1");
			expect(result).toEqual({ ok: true });
		});

		it("fails when lesson is not in course", async () => {
			const svc = createCurriculumAdminService(
				fakeDeps({
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
				}),
			);
			const result = await svc.verifyLessonInCourse("l2", "c1");
			expect(result).toEqual({ ok: false, error: "not_found" });
		});
	});

	describe("createModule", () => {
		it("assigns next sort order and returns moduleId", async () => {
			const deps = fakeDeps({
				getCourseCurriculum: makeCurriculum([
					{ id: "m1", title: "A", sortOrder: 2, lessons: [] },
				]),
			});
			const svc = createCurriculumAdminService(deps);
			const result = await svc.createModule("c1", "New Module", "u1");
			expect(result).toEqual({ ok: true, moduleId: "mod-1" });
			expect(deps.createAdminModule).toHaveBeenCalledWith({
				courseId: "c1",
				title: "New Module",
				sortOrder: 3,
				createdByUserId: "u1",
			});
		});
	});

	describe("createLesson", () => {
		it("assigns next sort order and returns lessonId", async () => {
			const deps = fakeDeps({
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
								sortOrder: 1,
							},
						],
					},
				]),
			});
			const svc = createCurriculumAdminService(deps);
			const result = await svc.createLesson("c1", "m1", "New Lesson", "u1");
			expect(result).toEqual({ ok: true, lessonId: "lesson-1" });
			expect(deps.createAdminLesson).toHaveBeenCalledWith({
				moduleId: "m1",
				title: "New Lesson",
				bodyMd: "",
				sortOrder: 2,
				createdByUserId: "u1",
			});
		});

		it("passes body when provided", async () => {
			const deps = fakeDeps({
				getCourseCurriculum: makeCurriculum([
					{
						id: "m1",
						title: "A",
						sortOrder: 0,
						lessons: [],
					},
				]),
			});
			const svc = createCurriculumAdminService(deps);
			await svc.createLesson("c1", "m1", "New Lesson", "u1", "hello");
			expect(deps.createAdminLesson).toHaveBeenCalledWith(
				expect.objectContaining({ bodyMd: "hello" }),
			);
		});

		it("returns not_found when module is not in course", async () => {
			const deps = fakeDeps();
			const svc = createCurriculumAdminService(deps);
			const result = await svc.createLesson("c1", "mX", "L", "u1");
			expect(result).toEqual({ ok: false, error: "not_found" });
			expect(deps.createAdminLesson).not.toHaveBeenCalled();
		});
	});

	describe("updateLesson", () => {
		it("updates a lesson when it belongs to the course", async () => {
			const deps = fakeDeps({
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
			const svc = createCurriculumAdminService(deps);
			const result = await svc.updateLesson("c1", "l1", { title: "Updated" });
			expect(result).toEqual({ ok: true });
			expect(deps.updateAdminLesson).toHaveBeenCalledWith("l1", {
				title: "Updated",
			});
		});

		it("returns not_found when lesson does not belong to course", async () => {
			const deps = fakeDeps();
			const svc = createCurriculumAdminService(deps);
			const result = await svc.updateLesson("c1", "lX", { title: "Updated" });
			expect(result).toEqual({ ok: false, error: "not_found" });
			expect(deps.updateAdminLesson).not.toHaveBeenCalled();
		});
	});

	describe("deleteModule", () => {
		it("deletes a module when it belongs to the course", async () => {
			const deps = fakeDeps({
				getCourseCurriculum: makeCurriculum([
					{ id: "m1", title: "A", sortOrder: 0, lessons: [] },
				]),
			});
			const svc = createCurriculumAdminService(deps);
			const result = await svc.deleteModule("c1", "m1");
			expect(result).toEqual({ ok: true });
			expect(deps.deleteAdminModule).toHaveBeenCalledWith("m1");
		});

		it("returns not_found when module does not belong to course", async () => {
			const deps = fakeDeps();
			const svc = createCurriculumAdminService(deps);
			const result = await svc.deleteModule("c1", "mX");
			expect(result).toEqual({ ok: false, error: "not_found" });
			expect(deps.deleteAdminModule).not.toHaveBeenCalled();
		});
	});

	describe("deleteLesson", () => {
		it("deletes a lesson when it belongs to the course", async () => {
			const deps = fakeDeps({
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
			const svc = createCurriculumAdminService(deps);
			const result = await svc.deleteLesson("c1", "l1");
			expect(result).toEqual({ ok: true });
			expect(deps.deleteAdminLesson).toHaveBeenCalledWith("l1");
		});

		it("returns not_found when lesson does not belong to course", async () => {
			const deps = fakeDeps();
			const svc = createCurriculumAdminService(deps);
			const result = await svc.deleteLesson("c1", "lX");
			expect(result).toEqual({ ok: false, error: "not_found" });
			expect(deps.deleteAdminLesson).not.toHaveBeenCalled();
		});
	});

	describe("reorderModules", () => {
		it("calls reorderAdminModules with the ordered ids", async () => {
			const deps = fakeDeps();
			const svc = createCurriculumAdminService(deps);
			const result = await svc.reorderModules("c1", ["m2", "m1"]);
			expect(result).toEqual({ ok: true });
			expect(deps.reorderAdminModules).toHaveBeenCalledWith("c1", ["m2", "m1"]);
		});
	});

	describe("reorderLessons", () => {
		it("calls reorderAdminLessons with the ordered ids", async () => {
			const deps = fakeDeps();
			const svc = createCurriculumAdminService(deps);
			const result = await svc.reorderLessons("m1", ["l2", "l1"]);
			expect(result).toEqual({ ok: true });
			expect(deps.reorderAdminLessons).toHaveBeenCalledWith("m1", ["l2", "l1"]);
		});

		it("returns not_found on foreign key violation", async () => {
			const deps = fakeDeps();
			deps.reorderAdminLessons.mockRejectedValue(
				new Error("violates foreign key constraint"),
			);
			const svc = createCurriculumAdminService(deps);
			const result = await svc.reorderLessons("m1", ["l2", "l1"]);
			expect(result).toEqual({ ok: false, error: "not_found" });
		});

		it("returns invalid_input on unique constraint violation", async () => {
			const deps = fakeDeps();
			deps.reorderAdminLessons.mockRejectedValue(
				new Error("violates unique constraint"),
			);
			const svc = createCurriculumAdminService(deps);
			const result = await svc.reorderLessons("m1", ["l2", "l1"]);
			expect(result).toEqual({ ok: false, error: "invalid_input" });
		});

		it("throws unexpected errors instead of swallowing", async () => {
			const deps = fakeDeps();
			deps.reorderAdminLessons.mockRejectedValue(
				new Error("connection timeout"),
			);
			const svc = createCurriculumAdminService(deps);
			await expect(svc.reorderLessons("m1", ["l2", "l1"])).rejects.toThrow(
				"connection timeout",
			);
		});
	});
});
