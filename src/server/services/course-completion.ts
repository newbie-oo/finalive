import type { IssueCertificateResult } from "@/server/certificates/certificate-issuer";

export interface CertificateIssuerLike {
  issue(
    enrollmentId: string,
    requestingUserId: string,
    requestingUserRole: string,
    requestingUserEmail: string,
  ): Promise<IssueCertificateResult>;
}

export interface CourseCompletionDeps {
  /** Mark a single lesson as completed for the user. */
  markLessonComplete: (userId: string, lessonId: string) => Promise<void>;
  /** Resolve the course ID that owns a lesson. */
  getCourseIdByLessonId: (lessonId: string) => Promise<string | null>;
  /** Check if the whole course is completed and mark enrollment if so. */
  checkAndMarkCourseComplete: (
    userId: string,
    courseId: string,
  ) => Promise<{ completed: boolean; enrollmentId: string | null }>;
  /** Issues the certificate PDF and notifies the student. */
  certificateIssuer: CertificateIssuerLike;
}

export interface HandleLessonCompleteResult {
  lessonCompleted: boolean;
  courseCompleted: boolean;
  certificateIssued: boolean;
}

export interface ReevaluateResult {
  courseCompleted: boolean;
  certificateIssued: boolean;
}

/**
 * Orchestrates the lesson → course → certificate completion flow.
 * Keeps API routes thin: they validate input and call this service;
 * the service owns the sequencing rules.
 */
export class CourseCompletionService {
  constructor(private deps: CourseCompletionDeps) {}

  /**
   * Mark a lesson complete, then check whether the course is now fully
   * finished. If so, issue a certificate (idempotent — safe to call twice).
   */
  async handleLessonComplete(params: {
    userId: string;
    userEmail: string;
    userRole?: string;
    lessonId: string;
  }): Promise<HandleLessonCompleteResult> {
    await this.deps.markLessonComplete(params.userId, params.lessonId);

    const courseId = await this.deps.getCourseIdByLessonId(params.lessonId);
    if (!courseId) {
      return {
        lessonCompleted: true,
        courseCompleted: false,
        certificateIssued: false,
      };
    }

    const { completed, enrollmentId } =
      await this.deps.checkAndMarkCourseComplete(params.userId, courseId);

    if (!completed || !enrollmentId) {
      return {
        lessonCompleted: true,
        courseCompleted: false,
        certificateIssued: false,
      };
    }

    const certResult = await this.deps.certificateIssuer.issue(
      enrollmentId,
      params.userId,
      params.userRole ?? "student",
      params.userEmail,
    );

    return {
      lessonCompleted: true,
      courseCompleted: true,
      certificateIssued: certResult.ok,
    };
  }

  /**
   * Re-evaluate course completion without marking a lesson complete.
   * Use this when a quiz is passed or another non-lesson gate is cleared.
   */
  async reevaluateCourseCompletion(params: {
    userId: string;
    userEmail: string;
    userRole?: string;
    courseId: string;
  }): Promise<ReevaluateResult> {
    const { completed, enrollmentId } =
      await this.deps.checkAndMarkCourseComplete(
        params.userId,
        params.courseId,
      );

    if (!completed || !enrollmentId) {
      return { courseCompleted: false, certificateIssued: false };
    }

    const certResult = await this.deps.certificateIssuer.issue(
      enrollmentId,
      params.userId,
      params.userRole ?? "student",
      params.userEmail,
    );

    return {
      courseCompleted: true,
      certificateIssued: certResult.ok,
    };
  }
}
