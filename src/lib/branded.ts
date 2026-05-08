import { z } from "zod";

/**
 * Compile-time branded string types for entity IDs.
 *
 * The brand is a phantom symbol — at runtime every branded ID is just a
 * plain string. The point is to stop functions from accepting one entity's
 * id where another's is expected (e.g. passing `userId` where the call
 * really wants `courseId`). This catches argument-order bugs that the
 * test suite cannot.
 *
 * Cast at trust boundaries only:
 *   - Route handler / server action: parse with the schema below — the
 *     parser returns a branded value.
 *   - Auth session: getSession() wraps user.id with asUserId().
 *   - Drizzle row → public API: cast in the repo with the as*Id helper.
 */
declare const __brand: unique symbol;
export type Brand<T, B extends string> = T & { readonly [__brand]: B };

export type UserId = Brand<string, "UserId">;
export type CourseId = Brand<string, "CourseId">;
export type LessonId = Brand<string, "LessonId">;
export type ModuleId = Brand<string, "ModuleId">;
export type QuizId = Brand<string, "QuizId">;
export type SlipId = Brand<string, "SlipId">;
export type PendingId = Brand<string, "PendingId">;
export type EnrollmentId = Brand<string, "EnrollmentId">;
export type MediaAssetId = Brand<string, "MediaAssetId">;
export type CertificateId = Brand<string, "CertificateId">;
export type AdminGrantId = Brand<string, "AdminGrantId">;

export const asUserId = (s: string): UserId => s as UserId;
export const asCourseId = (s: string): CourseId => s as CourseId;
export const asLessonId = (s: string): LessonId => s as LessonId;
export const asModuleId = (s: string): ModuleId => s as ModuleId;
export const asQuizId = (s: string): QuizId => s as QuizId;
export const asSlipId = (s: string): SlipId => s as SlipId;
export const asPendingId = (s: string): PendingId => s as PendingId;
export const asEnrollmentId = (s: string): EnrollmentId => s as EnrollmentId;
export const asMediaAssetId = (s: string): MediaAssetId => s as MediaAssetId;
export const asCertificateId = (s: string): CertificateId =>
	s as CertificateId;
export const asAdminGrantId = (s: string): AdminGrantId => s as AdminGrantId;

// Better Auth user.id is text (not uuid), the rest are pg uuids.
export const userIdSchema = z
	.string()
	.min(1)
	.transform((s) => asUserId(s));
export const courseIdSchema = z
	.string()
	.uuid()
	.transform((s) => asCourseId(s));
export const lessonIdSchema = z
	.string()
	.uuid()
	.transform((s) => asLessonId(s));
export const moduleIdSchema = z
	.string()
	.uuid()
	.transform((s) => asModuleId(s));
export const quizIdSchema = z
	.string()
	.uuid()
	.transform((s) => asQuizId(s));
export const slipIdSchema = z
	.string()
	.uuid()
	.transform((s) => asSlipId(s));
export const pendingIdSchema = z
	.string()
	.uuid()
	.transform((s) => asPendingId(s));
export const enrollmentIdSchema = z
	.string()
	.uuid()
	.transform((s) => asEnrollmentId(s));
export const mediaAssetIdSchema = z
	.string()
	.uuid()
	.transform((s) => asMediaAssetId(s));
export const certificateIdSchema = z
	.string()
	.uuid()
	.transform((s) => asCertificateId(s));
export const adminGrantIdSchema = z
	.string()
	.uuid()
	.transform((s) => asAdminGrantId(s));
