import "server-only";
import { and, desc, eq, lt, or, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
	paymentSlip,
	pendingEnrollment,
	SLIP_STATUS,
	type SlipStatus,
} from "@/db/schema/payment";
import { course } from "@/db/schema/course";
import { user as userTable } from "@/db/schema/auth";
import {
	buildCursorResponse,
	decodeCursor,
	type CursorParams,
	type CursorResponse,
} from "@/lib/pagination";

export type SlipQueueStatus = SlipStatus | "all";

export interface PendingSlipRow {
	id: string;
	status: SlipStatus;
	expectedAmount: string;
	reportedAmount: string | null;
	rejectionReason: string | null;
	rejectionNote: string | null;
	createdAt: string;
	pendingId: string;
	refCode: string;
	studentUserId: string;
	studentName: string | null;
	studentEmail: string | null;
	courseId: string;
	courseSlug: string;
	courseTitle: string;
}

export interface ListPendingSlipsParams extends CursorParams {
	status?: SlipQueueStatus;
}

export async function listPendingSlips(
	params: ListPendingSlipsParams,
): Promise<CursorResponse<PendingSlipRow>> {
	const status = params.status ?? "submitted";
	const cursor = decodeCursor(params.cursor);

	// Order by (createdAt DESC, id DESC) to keep cursor key stable when many
	// slips share a created_at second. The cursor is the boundary "last seen
	// (created_at, id)" — next page is rows strictly older OR (same ts AND id <).
	const cursorPredicate = cursor
		? or(
				lt(paymentSlip.createdAt, new Date(cursor.created_at)),
				and(
					eq(paymentSlip.createdAt, new Date(cursor.created_at)),
					lt(paymentSlip.id, cursor.id),
				),
			)
		: undefined;

	const statusPredicate =
		status === "all" ? undefined : eq(paymentSlip.status, status);

	const where = and(
		...[statusPredicate, cursorPredicate].filter((p) => p !== undefined),
	);

	const dbRows = await db
		.select({
			id: paymentSlip.id,
			status: paymentSlip.status,
			expectedAmount: paymentSlip.expectedAmount,
			reportedAmount: paymentSlip.reportedAmount,
			rejectionReason: paymentSlip.rejectionReason,
			rejectionNote: paymentSlip.rejectionNote,
			createdAt: paymentSlip.createdAt,
			pendingId: pendingEnrollment.id,
			refCode: pendingEnrollment.refCode,
			studentUserId: pendingEnrollment.userId,
			studentName: userTable.name,
			studentEmail: userTable.email,
			courseId: course.id,
			courseSlug: course.slug,
			courseTitle: course.title,
		})
		.from(paymentSlip)
		.innerJoin(
			pendingEnrollment,
			eq(paymentSlip.pendingEnrollmentId, pendingEnrollment.id),
		)
		.innerJoin(course, eq(pendingEnrollment.courseId, course.id))
		.innerJoin(userTable, eq(pendingEnrollment.userId, userTable.id))
		.where(where)
		.orderBy(desc(paymentSlip.createdAt), desc(paymentSlip.id))
		.limit(params.per_page);

	const rows: PendingSlipRow[] = dbRows.map((r) => ({
		...r,
		status: r.status as SlipStatus,
		createdAt: r.createdAt.toISOString(),
	}));

	return buildCursorResponse(rows, params);
}

export async function countPendingSlipsByStatus(): Promise<
	Record<SlipStatus, number>
> {
	const rows = await db
		.select({
			status: paymentSlip.status,
			total: sql<number>`count(*)::int`,
		})
		.from(paymentSlip)
		.groupBy(paymentSlip.status);
	const out = Object.fromEntries(
		SLIP_STATUS.map((s) => [s, 0]),
	) as Record<SlipStatus, number>;
	for (const r of rows) {
		if ((SLIP_STATUS as readonly string[]).includes(r.status)) {
			out[r.status as SlipStatus] = r.total;
		}
	}
	return out;
}
