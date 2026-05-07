import "server-only";
import { ApiError } from "@/lib/api-error";
import { isUniqueViolation } from "@/lib/pg-error";
import { generateRefCode } from "@/server/services/ref-code";
import { PendingEnrollmentRepo } from "@/server/repos/pending-enrollment";

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
	/** Mark any expired active pendings as "expired" so they don't block
	 *  the one_active_pending unique index. */
	expireOutdatedPendings: (userId: string, courseId: string) => Promise<void>;
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

export function makePendingEnrollmentService(): PendingEnrollmentService {
	return new PendingEnrollmentService({
		getCourseBySlug: PendingEnrollmentRepo.getCourseBySlug,
		findExistingPending: PendingEnrollmentRepo.findExistingPending,
		expireOutdatedPendings: PendingEnrollmentRepo.expireOutdatedPendings,
		insertPending: PendingEnrollmentRepo.insertPending,
		generateRefCode,
	});
}

/**
 * Handles creation of pending enrollments with idempotency and ref-code
 * collision retries. All DB access is injected so tests can fake deps.
 */
export class PendingEnrollmentService {
	constructor(private deps: PendingEnrollmentServiceDeps) {}

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

		await this.deps.expireOutdatedPendings(userId, courseRow.id);

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
					// Concurrent caller inserted between our findExisting / insert
					// (TOCTOU). Re-read the canonical row and hand it back instead
					// of erroring — the user wins the race they were going to win.
					const winner = await this.deps.findExistingPending(
						userId,
						courseRow.id,
					);
					if (winner) return winner;
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
