import "server-only";
import { ApiError } from "@/lib/api-error";
import { logger } from "@/lib/logger";

export interface GrantNotification {
  to: string;
  name: string | null;
  courseTitle: string;
  learnUrl: string;
}

export interface CourseGrantDeps {
  /** Returns true when the student already has an active enrollment. */
  hasActiveEnrollment: (
    studentUserId: string,
    courseId: string,
  ) => Promise<boolean>;
  /** Create the admin_grant record. Returns the grant id. */
  createGrant: (args: {
    adminUserId: string;
    studentUserId: string;
    courseId: string;
    reason: string;
    note: string;
  }) => Promise<string>;
  /** Create the enrollment record linked to the grant. */
  createEnrollment: (args: {
    userId: string;
    courseId: string;
    grantId: string;
  }) => Promise<void>;
  /** Look up student email + name. */
  getStudentContact: (
    userId: string,
  ) => Promise<{ email: string; name: string | null } | null>;
  /** Look up course title + slug. */
  getCourseInfo: (
    courseId: string,
  ) => Promise<{ title: string; slug: string } | null>;
  /** Best-effort notification. Failures are swallowed by the service. */
  sendNotification?: (notification: GrantNotification) => Promise<void>;
}

export interface CourseGrantResult {
  ok: true;
  grantId: string;
}

/**
 * Grants a student access to a course via admin override.
 * Idempotent on enrollment: if already enrolled, returns early.
 */
export class CourseGrantService {
  constructor(private deps: CourseGrantDeps) {}

  async grant(params: {
    adminUserId: string;
    studentUserId: string;
    courseId: string;
    reason: string;
    note: string | undefined;
    baseUrl: string;
  }): Promise<CourseGrantResult> {
    const alreadyEnrolled = await this.deps.hasActiveEnrollment(
      params.studentUserId,
      params.courseId,
    );
    if (alreadyEnrolled) {
      throw new ApiError("conflict", "already_enrolled");
    }

    const grantId = await this.deps.createGrant({
      adminUserId: params.adminUserId,
      studentUserId: params.studentUserId,
      courseId: params.courseId,
      reason: params.reason,
      note: params.note ?? "",
    });

    await this.deps.createEnrollment({
      userId: params.studentUserId,
      courseId: params.courseId,
      grantId,
    });

    if (this.deps.sendNotification) {
      try {
        const student = await this.deps.getStudentContact(params.studentUserId);
        const course = await this.deps.getCourseInfo(params.courseId);
        if (student && course) {
          await this.deps.sendNotification({
            to: student.email,
            name: student.name,
            courseTitle: course.title,
            learnUrl: `${params.baseUrl}/learn/${course.slug}`,
          });
        }
      } catch (err) {
        logger.error("course_grant.notify_failed", err, {
          studentUserId: params.studentUserId,
          courseId: params.courseId,
        });
      }
    }

    return { ok: true, grantId };
  }
}
