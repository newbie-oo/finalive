// Inspect postgres-js errors structurally instead of substring-matching messages.
// postgres-js throws errors that carry SQLSTATE in `code` and the violated
// constraint name in `constraint_name` (when a unique/check/fk fails).

export interface PgErrorShape {
  code?: string;
  constraint_name?: string;
}

export function asPgError(e: unknown): PgErrorShape | null {
  if (typeof e !== "object" || e === null) return null;
  const obj = e as Record<string, unknown>;
  if (typeof obj.code !== "string" && typeof obj.constraint_name !== "string") return null;
  return {
    code: typeof obj.code === "string" ? obj.code : undefined,
    constraint_name: typeof obj.constraint_name === "string" ? obj.constraint_name : undefined,
  };
}

export function isUniqueViolation(e: unknown, constraint?: string): boolean {
  const pg = asPgError(e);
  if (!pg || pg.code !== "23505") return false;
  return constraint ? pg.constraint_name === constraint : true;
}
