import { describe, it, expect, vi } from "vitest";
import { CourseCompletionChecker } from "./course-completion-checker";
import type { CourseCompletionCheckerDeps } from "./course-completion-checker";

vi.mock("server-only", () => ({}));

function fakeDeps(
	overrides?: Partial<CourseCompletionCheckerDeps>,
): CourseCompletionCheckerDeps {
	return {
		checkAndMarkCourseComplete: vi
			.fn()
			.mockResolvedValue({ completed: true, enrollmentId: "enr-1" }),
		certificateIssuer: {
			issue: vi.fn().mockResolvedValue({
				ok: true,
				certCode: "CERT001",
				pdfUrl: "https://example.com/cert.pdf",
			}),
		},
		...overrides,
	};
}

describe("CourseCompletionChecker", () => {
	it("issues certificate when course is now complete", async () => {
		const deps = fakeDeps();
		const checker = new CourseCompletionChecker(deps);
		const result = await checker.reevaluateCourseCompletion({
			userId: "u1",
			userEmail: "a@b.com",
			userRole: "student",
			courseId: "course-1",
		});
		expect(result).toEqual({
			courseCompleted: true,
			certificateIssued: true,
		});
	});

	it("returns early when course is not yet complete", async () => {
		const deps = fakeDeps({
			checkAndMarkCourseComplete: vi
				.fn()
				.mockResolvedValue({ completed: false, enrollmentId: null }),
		});
		const checker = new CourseCompletionChecker(deps);
		const result = await checker.reevaluateCourseCompletion({
			userId: "u1",
			userEmail: "a@b.com",
			courseId: "course-1",
		});
		expect(result).toEqual({
			courseCompleted: false,
			certificateIssued: false,
		});
		expect(deps.certificateIssuer.issue).not.toHaveBeenCalled();
	});

	it("handles certificate issuer failure gracefully", async () => {
		const deps = fakeDeps({
			certificateIssuer: {
				issue: vi.fn().mockResolvedValue({ ok: false, error: "admin_no_cert" }),
			},
		});
		const checker = new CourseCompletionChecker(deps);
		const result = await checker.reevaluateCourseCompletion({
			userId: "u1",
			userEmail: "a@b.com",
			userRole: "admin",
			courseId: "course-1",
		});
		expect(result).toEqual({
			courseCompleted: true,
			certificateIssued: false,
		});
	});
});
