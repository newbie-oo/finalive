import "server-only";
import { db } from "@/db/client";
import { getCourseIdByLessonId, getCourseInfo } from "@/server/repos/course";
import { MediaAssetRepo } from "@/server/repos/media-asset";
import { EnrollmentRepo } from "@/server/repos/enrollment";
import { LessonVideoRepo } from "@/server/repos/lesson-video";
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
import {
	EmailSlipNotifier,
	type SlipNotifier,
} from "@/server/services/slip-notifier";
import {
	EmailCourseCompletionNotifier,
	type CourseCompletionNotifier,
} from "@/server/services/notifier";
import { makeDbAuditLogger } from "@/server/services/audit";
import { getEnv } from "@/lib/env";
import { CourseCompletionService } from "@/server/services/course-completion";
import { CourseCompletionChecker } from "@/server/services/course-completion-checker";
import { QuizService } from "@/server/services/quiz-service";
import { BunnyVideoStatusService } from "@/server/services/bunny-video-status";
import { CertificateIssuer } from "@/server/certificates/certificate-issuer";
import { ReactPdfCertificateRenderer } from "@/server/certificates/certificate-renderer";
import {
	getCertificateByEnrollmentId,
	createCertificate,
} from "@/server/repos/certificate";
import { generateCertCode } from "@/server/services/cert-code";
import {
	getQuizById,
	getCorrectChoices,
	insertQuizAttempt,
} from "@/server/repos/quiz";
import { markLessonComplete } from "@/server/repos/progress";
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
 * auth-parse-call-return shells with no accidental composition. Adapter
 * factories that previously lived in their own *-factory.ts files are
 * inlined here so callers have one place to look up which concrete
 * implementation backs a given service.
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
			notifier: this.slipNotifier(),
			auditLogger: makeDbAuditLogger(),
		});
	},

	slipUpload(): SlipUploadService {
		return new SlipUploadService({
			repo: SlipRepo,
			storage: new R2ObjectStorage("private"),
			notifier: this.slipNotifier(),
			auditLogger: makeDbAuditLogger(),
			adminNotifyEmail: () => getEnv().ADMIN_NOTIFY_EMAIL,
		});
	},

	courseCompletion(): CourseCompletionService {
		return new CourseCompletionService({
			markLessonComplete,
			getCourseIdByLessonId,
			checkAndMarkCourseComplete,
			certificateIssuer: this.certificateIssuer(),
		});
	},

	courseCompletionChecker(): CourseCompletionChecker {
		return new CourseCompletionChecker({
			checkAndMarkCourseComplete,
			certificateIssuer: this.certificateIssuer(),
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

	bunnyStatus(): BunnyVideoStatusService {
		return new BunnyVideoStatusService({
			findAssetByBunnyId: MediaAssetRepo.findAssetByBunnyId,
			updateAsset: MediaAssetRepo.updateAsset,
			updateLessonDuration: LessonVideoRepo.updateLessonDuration,
		});
	},

	certificateIssuer(): CertificateIssuer {
		return new CertificateIssuer({
			renderer: new ReactPdfCertificateRenderer(),
			storage: new R2ObjectStorage("public"),
			notifier: this.courseCompletionNotifier(),
			getCertificateByEnrollmentId,
			getEnrollmentById: EnrollmentRepo.getById,
			getUserNameById: UserRepo.getNameById,
			getCourseTitleByEnrollmentId: EnrollmentRepo.getCourseTitleById,
			createMediaAsset: MediaAssetRepo.createRaw,
			createCertificate,
			generateCertCode,
		});
	},

	slipNotifier(): SlipNotifier {
		return new EmailSlipNotifier(db);
	},

	courseCompletionNotifier(): CourseCompletionNotifier {
		return new EmailCourseCompletionNotifier(db);
	},

	baseUrl(): string {
		return getEnv().BETTER_AUTH_URL.replace(/\/$/, "");
	},
};
