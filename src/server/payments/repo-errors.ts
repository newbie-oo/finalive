/**
 * Domain errors thrown by SlipRepo. The repo deliberately stays
 * HTTP-agnostic: callers (services) translate these into ApiError so
 * that data-access code can be reused outside of API routes (background
 * jobs, scripts, retries) without dragging request semantics along.
 */

export class SlipAlreadyReviewedError extends Error {
	constructor() {
		super("slip was reviewed by another admin");
		this.name = "SlipAlreadyReviewedError";
	}
}

export class EnrollmentAlreadyActiveError extends Error {
	constructor() {
		super("นักเรียนมีสิทธิ์เรียนคอร์สนี้อยู่แล้ว");
		this.name = "EnrollmentAlreadyActiveError";
	}
}

/**
 * Thrown when a write that should be guaranteed by Postgres returns no
 * row (e.g. an INSERT…RETURNING with no result). These represent
 * driver/schema invariants — surface as a generic 500 in routes.
 */
export class RepoIntegrityError extends Error {
	constructor(message: string) {
		super(message);
		this.name = "RepoIntegrityError";
	}
}
