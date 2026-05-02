import { describe, it, expect, vi } from "vitest";
import { ApiError } from "@/lib/api-error";
import { FreeEnrollmentService } from "./free-enrollment";

vi.mock("server-only", () => ({}));

function fakeDeps(
	overrides?: Partial<{
		getCourseBySlug: ReturnType<typeof vi.fn>;
		findActiveEnrollment: ReturnType<typeof vi.fn>;
		createEnrollment: ReturnType<typeof vi.fn>;
	}>,
) {
	return {
		getCourseBySlug: vi.fn().mockResolvedValue({
			id: "c1",
			slug: "free-course",
			isFree: true,
			status: "published",
		}),
		findActiveEnrollment: vi.fn().mockResolvedValue(false),
		createEnrollment: vi.fn().mockResolvedValue(undefined),
		...overrides,
	};
}

describe("FreeEnrollmentService", () => {
	it("enrolls user in a free course", async () => {
		const deps = fakeDeps();
		const svc = new FreeEnrollmentService(deps);
		const result = await svc.enroll("u1", "free-course");
		expect(result).toEqual({ ok: true, courseSlug: "free-course" });
		expect(deps.createEnrollment).toHaveBeenCalledWith({
			userId: "u1",
			courseId: "c1",
			source: "free_course",
			priceAtPurchase: "0",
		});
	});

	it("is idempotent when already enrolled", async () => {
		const deps = fakeDeps({
			findActiveEnrollment: vi.fn().mockResolvedValue(true),
		});
		const svc = new FreeEnrollmentService(deps);
		const result = await svc.enroll("u1", "free-course");
		expect(result).toEqual({ ok: true, courseSlug: "free-course" });
		expect(deps.createEnrollment).not.toHaveBeenCalled();
	});

	it("throws not_found when course does not exist", async () => {
		const deps = fakeDeps({
			getCourseBySlug: vi.fn().mockResolvedValue(undefined),
		});
		const svc = new FreeEnrollmentService(deps);
		await expect(svc.enroll("u1", "bad")).rejects.toThrow(ApiError);
	});

	it("throws invalid_state when course is not published", async () => {
		const deps = fakeDeps({
			getCourseBySlug: vi.fn().mockResolvedValue({
				id: "c1",
				slug: "draft",
				isFree: true,
				status: "draft",
			}),
		});
		const svc = new FreeEnrollmentService(deps);
		await expect(svc.enroll("u1", "draft")).rejects.toThrow("not published");
	});

	it("throws invalid_state when course is not free", async () => {
		const deps = fakeDeps({
			getCourseBySlug: vi.fn().mockResolvedValue({
				id: "c1",
				slug: "paid",
				isFree: false,
				status: "published",
			}),
		});
		const svc = new FreeEnrollmentService(deps);
		await expect(svc.enroll("u1", "paid")).rejects.toThrow("not free");
	});
});
