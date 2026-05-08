import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/server/repos/lesson-access", () => ({
	getLessonAccessRow: vi.fn(),
}));
vi.mock("@/server/repos/enrollment", () => ({
	EnrollmentRepo: { hasActive: vi.fn() },
}));

import { assertCanWriteLessonProgress } from "./lesson-progress-authz";
import { ApiError } from "@/lib/api-error";
import type { LessonAccessRow } from "@/server/repos/lesson-access";

const PAID_LESSON: LessonAccessRow = {
	courseId: "course-1",
	courseIsFree: false,
	lessonIsFree: false,
	lessonIsPreview: false,
};

const FREE_LESSON: LessonAccessRow = {
	courseId: "course-1",
	courseIsFree: false,
	lessonIsFree: true,
	lessonIsPreview: false,
};

const PREVIEW_LESSON: LessonAccessRow = {
	courseId: "course-1",
	courseIsFree: false,
	lessonIsFree: false,
	lessonIsPreview: true,
};

function lookups(
	access: LessonAccessRow | null,
	enrolled: boolean,
): {
	getLessonAccess: ReturnType<typeof vi.fn>;
	hasActiveEnrollment: ReturnType<typeof vi.fn>;
} {
	return {
		getLessonAccess: vi.fn().mockResolvedValue(access),
		hasActiveEnrollment: vi.fn().mockResolvedValue(enrolled),
	};
}

describe("assertCanWriteLessonProgress", () => {
	it("throws not_found when the lesson does not exist", async () => {
		const stubs = lookups(null, false);
		await expect(
			assertCanWriteLessonProgress(
				{ userId: "u1", userRole: "user", lessonId: "missing" },
				stubs,
			),
		).rejects.toMatchObject({ code: "not_found" });
		expect(stubs.hasActiveEnrollment).not.toHaveBeenCalled();
	});

	it("throws forbidden for a paid lesson when not enrolled", async () => {
		const stubs = lookups(PAID_LESSON, false);
		await expect(
			assertCanWriteLessonProgress(
				{ userId: "u1", userRole: "user", lessonId: "lesson-1" },
				stubs,
			),
		).rejects.toMatchObject({ code: "forbidden" });
	});

	it("allows a paid lesson when enrolled", async () => {
		const stubs = lookups(PAID_LESSON, true);
		await expect(
			assertCanWriteLessonProgress(
				{ userId: "u1", userRole: "user", lessonId: "lesson-1" },
				stubs,
			),
		).resolves.toBeUndefined();
		expect(stubs.hasActiveEnrollment).toHaveBeenCalledWith("u1", "course-1");
	});

	it("allows a free lesson without enrollment", async () => {
		const stubs = lookups(FREE_LESSON, false);
		await expect(
			assertCanWriteLessonProgress(
				{ userId: "u1", userRole: "user", lessonId: "lesson-1" },
				stubs,
			),
		).resolves.toBeUndefined();
	});

	it("allows a preview lesson without enrollment", async () => {
		const stubs = lookups(PREVIEW_LESSON, false);
		await expect(
			assertCanWriteLessonProgress(
				{ userId: "u1", userRole: "user", lessonId: "lesson-1" },
				stubs,
			),
		).resolves.toBeUndefined();
	});

	it("admin bypasses enrollment lookup entirely", async () => {
		const stubs = lookups(PAID_LESSON, false);
		await expect(
			assertCanWriteLessonProgress(
				{ userId: "admin-1", userRole: "admin", lessonId: "lesson-1" },
				stubs,
			),
		).resolves.toBeUndefined();
		expect(stubs.hasActiveEnrollment).not.toHaveBeenCalled();
	});

	it("ApiError instance is thrown (not a plain object)", async () => {
		const stubs = lookups(PAID_LESSON, false);
		await expect(
			assertCanWriteLessonProgress(
				{ userId: "u1", userRole: "user", lessonId: "lesson-1" },
				stubs,
			),
		).rejects.toBeInstanceOf(ApiError);
	});
});
