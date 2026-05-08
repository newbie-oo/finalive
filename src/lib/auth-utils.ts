/**
 * Centralised role checks. Inline `role === "admin"` was scattered across
 * services and components — using this helper keeps the literal in one place
 * so a future role rename (e.g. "owner") is a single-file change.
 */

export interface RoleBearer {
	role?: string | null;
}

/** True when the bearer carries the admin role. */
export function isAdmin(user: RoleBearer | null | undefined): boolean {
	return user?.role === "admin";
}
