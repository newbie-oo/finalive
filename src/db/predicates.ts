import { and, eq, isNull, type AnyColumn, type SQL } from "drizzle-orm";
import { course } from "@/db/schema/course";

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

/**
 * Course is "publicly visible": `status = 'published' AND deleted_at IS NULL`.
 * Wraps the two-clause check that every public-facing course query repeats so
 * the soft-delete + publish gate stay in lockstep.
 */
export function coursePublic(): SQL {
	return and(eq(course.status, "published"), notDeleted(course))!;
}
