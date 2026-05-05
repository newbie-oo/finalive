import "server-only";
import { ApiError } from "@/lib/api-error";

export interface FreeEnrollmentDeps {
  getCourseBySlug: (
    slug: string,
  ) => Promise<
    { id: string; slug: string; isFree: boolean; status: string } | undefined
  >;
  findActiveEnrollment: (userId: string, courseId: string) => Promise<boolean>;
  createEnrollment: (args: {
    userId: string;
    courseId: string;
    source: string;
    priceAtPurchase: string;
  }) => Promise<void>;
}

export interface FreeEnrollmentResult {
  ok: true;
  courseSlug: string;
}

/**
 * Idempotent free-course enrollment. Checks the course is published and free,
 * then creates an active enrollment (or returns existing).
 */
export class FreeEnrollmentService {
  constructor(private deps: FreeEnrollmentDeps) {}

  async enroll(
    userId: string,
    courseSlug: string,
  ): Promise<FreeEnrollmentResult> {
    const courseRow = await this.deps.getCourseBySlug(courseSlug);
    if (!courseRow) throw new ApiError("not_found", "course not found");
    if (courseRow.status !== "published")
      throw new ApiError("invalid_state", "course not published");
    if (!courseRow.isFree)
      throw new ApiError("invalid_state", "this course is not free");

    const alreadyEnrolled = await this.deps.findActiveEnrollment(
      userId,
      courseRow.id,
    );
    if (alreadyEnrolled) {
      return { ok: true, courseSlug: courseRow.slug };
    }

    await this.deps.createEnrollment({
      userId,
      courseId: courseRow.id,
      source: "free_course",
      priceAtPurchase: "0",
    });

    return { ok: true, courseSlug: courseRow.slug };
  }
}
