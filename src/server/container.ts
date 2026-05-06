import "server-only";
import { getCourseIdByLessonId, getCourseInfo } from "@/server/repos/course";
import { MediaAssetRepo } from "@/server/repos/media-asset";
import { EnrollmentRepo } from "@/server/repos/enrollment";
import { AdminGrantRepo } from "@/server/repos/admin-grant";
import { UserRepo } from "@/server/repos/user";
import { checkAndMarkCourseComplete } from "@/server/repos/learn-completion";
import { R2ObjectStorage } from "@/server/services/storage";
import { CoverImageService } from "@/server/services/cover-image";
import { FreeEnrollmentService } from "@/server/services/free-enrollment";
import { CourseGrantService } from "@/server/services/course-grant";
import { SlipReviewService } from "@/server/payments/slip-review-service";
import { SlipUploadService } from "@/server/payments/slip-upload-service";
import { SlipRepo } from "@/server/payments/slip-repo";
import { makeEmailSlipNotifier } from "@/server/services/slip-notifier-factory";
import { makeDbAuditLogger } from "@/server/services/audit";
import { getEnv } from "@/lib/env";
import { CourseCompletionService } from "@/server/services/course-completion";
import { CourseCompletionChecker } from "@/server/services/course-completion-checker";
import { QuizService } from "@/server/services/quiz-service";
import {
	getQuizById,
	getCorrectChoices,
	insertQuizAttempt,
} from "@/server/repos/quiz";
import { markLessonComplete } from "@/server/repos/progress";
import { certificateIssuerFactory } from "@/server/services/certificate-factory";
import { updateCourseCover } from "@/server/adapters/cover-image-adapter";
import {
	getCourseBySlugForEnrollment,
	createActiveEnrollment,
} from "@/server/adapters/free-enrollment-adapter";
import {
	createEnrollmentFromGrant,
	sendGrantNotification,
} from "@/server/adapters/course-grant-adapter";

/**
 * Central service composition root.
 *
 * All dependency wiring lives here so actions stay pure
 * auth-parse-call-return shells with no accidental composition.
 */

export const container = {
	coverImage(): CoverImageService {
		return new CoverImageService({
			storage: new R2ObjectStorage("public"),
			getMediaAsset: MediaAssetRepo.getById,
			deleteMediaAsset: MediaAssetRepo.delete,
			updateCourseCover,
		});
	},

	freeEnrollment(): FreeEnrollmentService {
		return new FreeEnrollmentService({
			getCourseBySlug: getCourseBySlugForEnrollment,
			findActiveEnrollment: EnrollmentRepo.hasActive,
			createEnrollment: createActiveEnrollment,
		});
	},

	courseGrant(): CourseGrantService {
		return new CourseGrantService({
			hasActiveEnrollment: EnrollmentRepo.hasActive,
			createGrant: AdminGrantRepo.create,
			createEnrollment: createEnrollmentFromGrant,
			getStudentContact: UserRepo.getContact,
			getCourseInfo,
			sendNotification: sendGrantNotification,
		});
	},

	slipReview(): SlipReviewService {
		return new SlipReviewService({
			repo: SlipRepo,
			notifier: makeEmailSlipNotifier(),
			auditLogger: makeDbAuditLogger(),
		});
	},

	slipUpload(): SlipUploadService {
		return new SlipUploadService({
			repo: SlipRepo,
			storage: new R2ObjectStorage("private"),
			notifier: makeEmailSlipNotifier(),
			auditLogger: makeDbAuditLogger(),
		});
	},

	courseCompletion(): CourseCompletionService {
		return new CourseCompletionService({
			markLessonComplete,
			getCourseIdByLessonId,
			checkAndMarkCourseComplete,
			certificateIssuer: certificateIssuerFactory(),
		});
	},

	courseCompletionChecker(): CourseCompletionChecker {
		return new CourseCompletionChecker({
			checkAndMarkCourseComplete,
			certificateIssuer: certificateIssuerFactory(),
		});
	},

	quizService(): QuizService {
		return new QuizService({
			getQuizById,
			getCorrectChoices,
			isUserEnrolledInCourse: EnrollmentRepo.hasActive,
			getCourseIdByLessonId,
			insertQuizAttempt,
			completionChecker: this.courseCompletionChecker(),
		});
	},

	baseUrl(): string {
		return getEnv().BETTER_AUTH_URL.replace(/\/$/, "");
	},
};
