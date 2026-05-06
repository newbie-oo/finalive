import "server-only";
import {
	isUserEnrolledInCourse,
	getCourseIdByLessonId,
	getPublishedCourseBySlug,
	getCourseInfo,
} from "@/server/repos/course";
import { updateAdminCourse } from "@/server/repos/admin-course";
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
import { sendGrantCourseEmail } from "@/server/services/mailer";
import { getEnv } from "@/lib/env";
import { CourseCompletionService } from "@/server/services/course-completion";
import { CourseCompletionChecker } from "@/server/services/course-completion-checker";
import { QuizService } from "@/server/services/quiz-service";
import { getQuizById, submitQuizAttempt } from "@/server/repos/quiz";
import { markLessonComplete } from "@/server/repos/progress";
import { certificateIssuerFactory } from "@/server/services/certificate-factory";

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
			updateCourseCover: async (courseId, mediaAssetId) => {
				await updateAdminCourse(courseId, { coverMediaId: mediaAssetId });
			},
		});
	},

	freeEnrollment(): FreeEnrollmentService {
		return new FreeEnrollmentService({
			getCourseBySlug: async (slug) => {
				const row = await getPublishedCourseBySlug(slug, {
					includeUnpublished: true,
				});
				return row ?? undefined;
			},
			findActiveEnrollment: EnrollmentRepo.hasActive,
			createEnrollment: async (args) => {
				await EnrollmentRepo.create({ ...args, status: "active" });
			},
		});
	},

	courseGrant(): CourseGrantService {
		return new CourseGrantService({
			hasActiveEnrollment: EnrollmentRepo.hasActive,
			createGrant: AdminGrantRepo.create,
			createEnrollment: async (args) => {
				await EnrollmentRepo.create({
					userId: args.userId,
					courseId: args.courseId,
					source: "admin_grant",
					sourceGrantId: args.grantId,
					priceAtPurchase: "0",
					status: "active",
				});
			},
			getStudentContact: UserRepo.getContact,
			getCourseInfo,
			sendNotification: async (n) => {
				await sendGrantCourseEmail({
					to: n.to,
					name: n.name ?? "",
					courseTitle: n.courseTitle,
					learnUrl: n.learnUrl,
				});
			},
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
			isUserEnrolledInCourse,
			getCourseIdByLessonId,
			submitQuizAttempt,
			completionChecker: this.courseCompletionChecker(),
		});
	},

	baseUrl(): string {
		return getEnv().BETTER_AUTH_URL.replace(/\/$/, "");
	},
};
