import "server-only";
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
import * as SlipRepo from "@/server/repos/slip";
import {
	EmailSlipNotifier,
	type SlipNotifier,
} from "@/server/services/slip-notifier";
import {
	EmailCourseCompletionNotifier,
	type CourseCompletionNotifier,
} from "@/server/services/notifier";
import { makeDbEmailQueueRepo } from "@/server/repos/email-queue";
import { makeDbAuditLogger, type AuditLogger } from "@/server/services/audit";
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
 *
 * Services are memoised lazily — none hold per-request state, so a single
 * instance per Node process is correct and saves the allocation churn
 * the previous "new on every call" approach paid for things like the
 * audit logger and the slip-review wiring on every endpoint hit.
 */

// ── Memoised instances (lazy) ──────────────────────────────────────
let _publicStorage: R2ObjectStorage | undefined;
let _privateStorage: R2ObjectStorage | undefined;
let _auditLogger: AuditLogger | undefined;
let _coverImage: CoverImageService | undefined;
let _freeEnrollment: FreeEnrollmentService | undefined;
let _courseGrant: CourseGrantService | undefined;
let _slipReview: SlipReviewService | undefined;
let _slipUpload: SlipUploadService | undefined;
let _courseCompletion: CourseCompletionService | undefined;
let _courseCompletionChecker: CourseCompletionChecker | undefined;
let _quizService: QuizService | undefined;
let _bunnyStatus: BunnyVideoStatusService | undefined;
let _certificateIssuer: CertificateIssuer | undefined;
let _slipNotifier: SlipNotifier | undefined;
let _courseCompletionNotifier: CourseCompletionNotifier | undefined;
let _emailQueueRepo: ReturnType<typeof makeDbEmailQueueRepo> | undefined;

function publicStorage(): R2ObjectStorage {
	return (_publicStorage ??= new R2ObjectStorage("public"));
}

function privateStorage(): R2ObjectStorage {
	return (_privateStorage ??= new R2ObjectStorage("private"));
}

function auditLogger(): AuditLogger {
	return (_auditLogger ??= makeDbAuditLogger());
}

function emailQueueRepo() {
	return (_emailQueueRepo ??= makeDbEmailQueueRepo());
}

export const container = {
	coverImage(): CoverImageService {
		return (_coverImage ??= new CoverImageService({
			storage: publicStorage(),
			getMediaAsset: MediaAssetRepo.getById,
			deleteMediaAsset: MediaAssetRepo.delete,
			updateCourseCover,
		}));
	},

	freeEnrollment(): FreeEnrollmentService {
		return (_freeEnrollment ??= new FreeEnrollmentService({
			getCourseBySlug: getCourseBySlugForEnrollment,
			findActiveEnrollment: EnrollmentRepo.hasActive,
			createEnrollment: createActiveEnrollment,
		}));
	},

	courseGrant(): CourseGrantService {
		return (_courseGrant ??= new CourseGrantService({
			hasActiveEnrollment: EnrollmentRepo.hasActive,
			createGrant: AdminGrantRepo.create,
			createEnrollment: createEnrollmentFromGrant,
			getStudentContact: UserRepo.getContact,
			getCourseInfo,
			sendNotification: sendGrantNotification,
		}));
	},

	slipReview(): SlipReviewService {
		return (_slipReview ??= new SlipReviewService({
			repo: {
				loadForReview: SlipRepo.loadSlipForReview,
				runAcceptTx: SlipRepo.runAcceptTx,
				runRejectTx: SlipRepo.runRejectTx,
			},
			notifier: this.slipNotifier(),
			auditLogger: auditLogger(),
		}));
	},

	slipUpload(): SlipUploadService {
		return (_slipUpload ??= new SlipUploadService({
			repo: {
				countSlipsForPending: SlipRepo.countSlipsForPending,
				loadPending: SlipRepo.loadPending,
				loadCourseInfo: SlipRepo.loadCourseInfo,
				reserveMediaAsset: SlipRepo.reserveMediaAsset,
				finalizeUploadTx: SlipRepo.finalizeUploadTx,
			},
			storage: privateStorage(),
			notifier: this.slipNotifier(),
			auditLogger: auditLogger(),
			adminNotifyEmail: () => getEnv().ADMIN_NOTIFY_EMAIL,
		}));
	},

	courseCompletion(): CourseCompletionService {
		return (_courseCompletion ??= new CourseCompletionService({
			markLessonComplete,
			getCourseIdByLessonId,
			checkAndMarkCourseComplete,
			certificateIssuer: this.certificateIssuer(),
		}));
	},

	courseCompletionChecker(): CourseCompletionChecker {
		return (_courseCompletionChecker ??= new CourseCompletionChecker({
			checkAndMarkCourseComplete,
			certificateIssuer: this.certificateIssuer(),
		}));
	},

	quizService(): QuizService {
		return (_quizService ??= new QuizService({
			getQuizById,
			getCorrectChoices,
			isUserEnrolledInCourse: EnrollmentRepo.hasActive,
			getCourseIdByLessonId,
			insertQuizAttempt,
			completionChecker: this.courseCompletionChecker(),
		}));
	},

	bunnyStatus(): BunnyVideoStatusService {
		return (_bunnyStatus ??= new BunnyVideoStatusService({
			findAssetByBunnyId: MediaAssetRepo.findAssetByBunnyId,
			updateAsset: MediaAssetRepo.updateAsset,
			updateLessonDuration: LessonVideoRepo.updateLessonDuration,
		}));
	},

	certificateIssuer(): CertificateIssuer {
		return (_certificateIssuer ??= new CertificateIssuer({
			renderer: new ReactPdfCertificateRenderer(),
			storage: publicStorage(),
			notifier: this.courseCompletionNotifier(),
			getCertificateByEnrollmentId,
			getEnrollmentById: EnrollmentRepo.getById,
			getUserNameById: UserRepo.getNameById,
			getCourseTitleByEnrollmentId: EnrollmentRepo.getCourseTitleById,
			createMediaAsset: MediaAssetRepo.createRaw,
			createCertificate,
			generateCertCode,
		}));
	},

	slipNotifier(): SlipNotifier {
		return (_slipNotifier ??= new EmailSlipNotifier(emailQueueRepo()));
	},

	courseCompletionNotifier(): CourseCompletionNotifier {
		return (_courseCompletionNotifier ??= new EmailCourseCompletionNotifier(
			emailQueueRepo(),
		));
	},

	baseUrl(): string {
		return getEnv().BETTER_AUTH_URL.replace(/\/$/, "");
	},
};
