import { isNull, type AnyColumn, type SQL } from "drizzle-orm";

/**
 * Reusable Drizzle predicates so business intent ("not deleted") reads as
 * one identifier instead of an `isNull(table.deletedAt)` ritual that's easy
 * to forget in new queries. New tables exposing a `deletedAt` column should
 * be filtered through this helper to keep the soft-delete contract uniform.
 */

interface SoftDeletable {
	deletedAt: AnyColumn;
}

/** SQL fragment: `<table>.deleted_at IS NULL`. */
export function notDeleted<T extends SoftDeletable>(table: T): SQL {
	return isNull(table.deletedAt);
}
