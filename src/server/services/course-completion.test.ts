import { describe, it, expect, vi, type Mock } from "vitest";
import { CourseCompletionService } from "./course-completion";
import type { CourseCompletionDeps } from "./course-completion";

vi.mock("server-only", () => ({}));

function fakeDeps(overrides?: Partial<CourseCompletionDeps>) {
	return {
		markLessonComplete: vi.fn().mockResolvedValue(undefined) as Mock,
		getCourseIdByLessonId: vi.fn().mockResolvedValue("course-1") as Mock,
		checkAndMarkCourseComplete: vi
			.fn()
			.mockResolvedValue({ completed: true, enrollmentId: "enr-1" }) as Mock,
		certificateIssuer: {
			issue: vi.fn().mockResolvedValue({
				ok: true,
				certCode: "CERT001",
				pdfUrl: "https://example.com/cert.pdf",
			}) as Mock,
		},
		...overrides,
	} as CourseCompletionDeps;
}

describe("CourseCompletionService", () => {
	it("marks lesson complete and returns early when course is not finished", async () => {
		const deps = fakeDeps({
			checkAndMarkCourseComplete: vi
				.fn()
				.mockResolvedValue({ completed: false, enrollmentId: null }),
		});
		const service = new CourseCompletionService(deps);
		const result = await service.handleLessonComplete({
			userId: "u1",
			userEmail: "a@b.com",
			userRole: "student",
			lessonId: "l1",
		});
		expect(result).toEqual({
			lessonCompleted: true,
			courseCompleted: false,
			certificateIssued: false,
		});
		expect(deps.markLessonComplete).toHaveBeenCalledWith("u1", "l1", undefined);
		expect(deps.certificateIssuer.issue).not.toHaveBeenCalled();
	});

	it("issues certificate when course becomes fully completed", async () => {
		const deps = fakeDeps();
		const service = new CourseCompletionService(deps);
		const result = await service.handleLessonComplete({
			userId: "u1",
			userEmail: "a@b.com",
			userRole: "student",
			lessonId: "l1",
		});
		expect(result).toEqual({
			lessonCompleted: true,
			courseCompleted: true,
			certificateIssued: true,
		});
		expect(deps.certificateIssuer.issue).toHaveBeenCalledWith(
			"enr-1",
			"u1",
			"student",
			"a@b.com",
		);
	});

	it("returns early when lesson has no associated course", async () => {
		const deps = fakeDeps({
			getCourseIdByLessonId: vi.fn().mockResolvedValue(null),
		});
		const service = new CourseCompletionService(deps);
		const result = await service.handleLessonComplete({
			userId: "u1",
			userEmail: "a@b.com",
			lessonId: "orphan",
		});
		expect(result.courseCompleted).toBe(false);
		expect(deps.checkAndMarkCourseComplete).not.toHaveBeenCalled();
	});

	it("handles certificate issuer failure gracefully", async () => {
		const deps = fakeDeps({
			certificateIssuer: {
				issue: vi.fn().mockResolvedValue({ ok: false, error: "admin_no_cert" }),
			},
		});
		const service = new CourseCompletionService(deps);
		const result = await service.handleLessonComplete({
			userId: "u1",
			userEmail: "a@b.com",
			userRole: "admin",
			lessonId: "l1",
		});
		expect(result).toEqual({
			lessonCompleted: true,
			courseCompleted: true,
			certificateIssued: false,
		});
	});

	it("is idempotent — safe to call twice for same lesson", async () => {
		const deps = fakeDeps();
		const service = new CourseCompletionService(deps);
		const params = { userId: "u1", userEmail: "a@b.com", lessonId: "l1" };
		await service.handleLessonComplete(params);
		await service.handleLessonComplete(params);
		expect(deps.markLessonComplete).toHaveBeenCalledTimes(2);
		expect(deps.certificateIssuer.issue).toHaveBeenCalledTimes(2);
	});
});
