import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { enrollment, adminGrant } from "@/db/schema/enrollment";
import { course } from "@/db/schema/course";
import { mediaAsset } from "@/db/schema/media";
import { user } from "@/db/schema/auth";
import {
	isUserEnrolledInCourse,
	getCourseIdByLessonId,
	getPublishedCourseBySlug,
} from "@/server/repos/course";
import { updateAdminCourse } from "@/server/repos/admin-course";
import { checkAndMarkCourseComplete } from "@/server/repos/learn-completion";
import { R2ObjectStorage } from "@/server/services/storage";
import { CoverImageService } from "@/server/services/cover-image";
import { FreeEnrollmentService } from "@/server/services/free-enrollment";
import { CourseGrantService } from "@/server/services/course-grant";
import { SlipReviewService } from "@/server/payments/slip-review-service";
import { SlipUploadService } from "@/server/payments/slip-upload-service";
import { SlipRepo } from "@/server/payments/slip-repo";
import { EmailSlipNotifier } from "@/server/services/slip-notifier";
import { makeDbAuditLogger } from "@/server/services/audit";
import { sendGrantCourseEmail } from "@/server/services/mailer";
import { getEnv } from "@/lib/env";
import { CourseCompletionService } from "@/server/services/course-completion";
import { CourseCompletionChecker } from "@/server/services/course-completion-checker";
import { QuizService } from "@/server/services/quiz-service";
import { getQuizById, submitQuizAttempt } from "@/server/repos/quiz";
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
			getMediaAsset: async (mediaAssetId) => {
				const rows = await db
					.select({ id: mediaAsset.id, storageKey: mediaAsset.storageKey })
					.from(mediaAsset)
					.where(eq(mediaAsset.id, mediaAssetId))
					.limit(1);
				return rows[0] ?? null;
			},
			deleteMediaAsset: async (mediaAssetId) => {
				await db.delete(mediaAsset).where(eq(mediaAsset.id, mediaAssetId));
			},
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
			findActiveEnrollment: isUserEnrolledInCourse,
			createEnrollment: async (args) => {
				await db.insert(enrollment).values({
					userId: args.userId,
					courseId: args.courseId,
					source: args.source,
					priceAtPurchase: args.priceAtPurchase,
					status: "active",
				});
			},
		});
	},

	courseGrant(): CourseGrantService {
		return new CourseGrantService({
			hasActiveEnrollment: async (studentUserId, courseId) => {
				const rows = await db
					.select({ id: enrollment.id })
					.from(enrollment)
					.where(
						and(
							eq(enrollment.userId, studentUserId),
							eq(enrollment.courseId, courseId),
							eq(enrollment.status, "active"),
						),
					)
					.limit(1);
				return rows.length > 0;
			},
			createGrant: async (args) => {
				const [row] = await db
					.insert(adminGrant)
					.values({
						adminUserId: args.adminUserId,
						studentUserId: args.studentUserId,
						courseId: args.courseId,
						reason: args.reason,
						note: args.note,
					})
					.returning({ id: adminGrant.id });
				return row!.id;
			},
			createEnrollment: async (args) => {
				await db.insert(enrollment).values({
					userId: args.userId,
					courseId: args.courseId,
					source: "admin_grant",
					sourceGrantId: args.grantId,
					status: "active",
				});
			},
			getStudentContact: async (userId) => {
				const rows = await db
					.select({ email: user.email, name: user.name })
					.from(user)
					.where(eq(user.id, userId))
					.limit(1);
				return rows[0] ?? null;
			},
			getCourseInfo: async (courseId) => {
				const rows = await db
					.select({ title: course.title, slug: course.slug })
					.from(course)
					.where(eq(course.id, courseId))
					.limit(1);
				return rows[0] ?? null;
			},
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
			notifier: new EmailSlipNotifier(),
			auditLogger: makeDbAuditLogger(),
		});
	},

	slipUpload(): SlipUploadService {
		return new SlipUploadService({
			repo: SlipRepo,
			storage: new R2ObjectStorage("private"),
			notifier: new EmailSlipNotifier(),
			auditLogger: makeDbAuditLogger(),
		});
	},

	courseCompletion(): CourseCompletionService {
		return new CourseCompletionService({
			markLessonComplete: async (userId, lessonId, durationSeconds) => {
				const { markLessonComplete } = await import("@/server/repos/progress");
				await markLessonComplete(userId, lessonId, durationSeconds);
			},
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
