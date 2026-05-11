import "server-only";

export type AccessResult =
	| { ok: true }
	| { ok: false; reason: "login_required" | "purchase_required" };

export interface CheckLessonAccessInput {
	lesson: { isPreview: boolean; isFree: boolean };
	course: { isFree: boolean };
	isEnrolled: boolean;
	isAuthenticated: boolean;
	isAdmin?: boolean;
}

type AccessRule = (ctx: CheckLessonAccessInput) => AccessResult | null;

const ACCESS_RULES: AccessRule[] = [
	// Admins can view any lesson without enrollment.
	(ctx) => (ctx.isAdmin ? { ok: true } : null),
	// Preview or free lessons are always accessible.
	(ctx) => (ctx.lesson.isPreview || ctx.lesson.isFree ? { ok: true } : null),
	// Entirely free courses are always accessible.
	(ctx) => (ctx.course.isFree ? { ok: true } : null),
	// Authenticated + enrolled users get everything.
	(ctx) => (ctx.isEnrolled ? { ok: true } : null),
	// Not authenticated → login first.
	(ctx) =>
		!ctx.isAuthenticated ? { ok: false, reason: "login_required" } : null,
	// Authenticated but not enrolled → buy.
	() => ({ ok: false, reason: "purchase_required" }),
];

/**
 * Evaluate lesson access through an ordered rule engine.
 * Rules are checked in sequence; the first non-null result wins.
 * New access modes append a rule without touching existing ones.
 */
export function checkLessonAccess(input: CheckLessonAccessInput): AccessResult {
	for (const rule of ACCESS_RULES) {
		const result = rule(input);
		if (result) return result;
	}
	// Should never reach here (last rule is a catch-all).
	return { ok: false, reason: "purchase_required" };
}
