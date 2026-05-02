import "server-only";
import { and, eq, gt, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { course } from "@/db/schema/course";
import { pendingEnrollment } from "@/db/schema/payment";
import { ApiError } from "@/lib/api-error";
import { isUniqueViolation } from "@/lib/pg-error";
import { generateRefCode } from "@/server/services/ref-code";

const PENDING_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_REF_CODE_RETRIES = 5;

export interface CreatePendingResult {
	id: string;
	refCode: string;
	amount: string;
	expiresAt: Date;
}

export interface PendingEnrollmentServiceDeps {
	getCourseBySlug: (
		slug: string,
	) => Promise<
		{ id: string; price: string; isFree: boolean; status: string } | undefined
	>;
	findExistingPending: (
		userId: string,
		courseId: string,
	) => Promise<
		{ id: string; refCode: string; amount: string; expiresAt: Date } | undefined
	>;
	insertPending: (args: {
		userId: string;
		courseId: string;
		amount: string;
		refCode: string;
		expiresAt: Date;
	}) => Promise<
		{ id: string; refCode: string; amount: string; expiresAt: Date } | undefined
	>;
	generateRefCode: () => string;
}

export const defaultDeps: PendingEnrollmentServiceDeps = {
	getCourseBySlug: async (slug) => {
		const rows = await db
			.select({
				id: course.id,
				price: course.price,
				isFree: course.isFree,
				status: course.status,
			})
			.from(course)
			.where(eq(course.slug, slug))
			.limit(1);
		return rows[0];
	},
	findExistingPending: async (userId, courseId) => {
		const rows = await db
			.select()
			.from(pendingEnrollment)
			.where(
				and(
					eq(pendingEnrollment.userId, userId),
					eq(pendingEnrollment.courseId, courseId),
					inArray(pendingEnrollment.status, [
						"awaiting_payment",
						"slip_submitted",
					]),
					gt(pendingEnrollment.expiresAt, new Date()),
				),
			)
			.limit(1);
		if (!rows[0]) return undefined;
		return {
			id: rows[0].id,
			refCode: rows[0].refCode,
			amount: rows[0].amount,
			expiresAt: rows[0].expiresAt,
		};
	},
	insertPending: async (args) => {
		const [row] = await db
			.insert(pendingEnrollment)
			.values({
				userId: args.userId,
				courseId: args.courseId,
				amount: args.amount,
				refCode: args.refCode,
				status: "awaiting_payment",
				expiresAt: args.expiresAt,
			})
			.returning({
				id: pendingEnrollment.id,
				refCode: pendingEnrollment.refCode,
				amount: pendingEnrollment.amount,
				expiresAt: pendingEnrollment.expiresAt,
			});
		return row;
	},
	generateRefCode,
};

/**
 * Handles creation of pending enrollments with idempotency and ref-code
 * collision retries. All DB access is injected so tests can fake deps.
 */
export class PendingEnrollmentService {
	constructor(private deps: PendingEnrollmentServiceDeps = defaultDeps) {}

	async create(
		userId: string,
		courseSlug: string,
	): Promise<CreatePendingResult> {
		const courseRow = await this.deps.getCourseBySlug(courseSlug);
		if (!courseRow) throw new ApiError("not_found", "course not found");
		if (courseRow.status !== "published")
			throw new ApiError("invalid_state", "course not published");
		if (courseRow.isFree)
			throw new ApiError("invalid_state", "free course — no payment required");

		const existing = await this.deps.findExistingPending(userId, courseRow.id);
		if (existing) return existing;

		const expiresAt = new Date(Date.now() + PENDING_TTL_MS);
		for (let attempt = 0; attempt < MAX_REF_CODE_RETRIES; attempt += 1) {
			const refCode = this.deps.generateRefCode();
			try {
				const row = await this.deps.insertPending({
					userId,
					courseId: courseRow.id,
					amount: courseRow.price,
					refCode,
					expiresAt,
				});
				if (!row)
					throw new ApiError("internal_error", "insert returned no rows");
				return row;
			} catch (e: unknown) {
				if (isUniqueViolation(e, "pending_enrollment_ref_code_unique"))
					continue;
				if (isUniqueViolation(e, "one_active_pending")) {
					throw new ApiError(
						"conflict",
						"another pending enrollment already exists",
					);
				}
				throw e;
			}
		}
		throw new ApiError("internal_error", "could not generate unique ref code");
	}
}
