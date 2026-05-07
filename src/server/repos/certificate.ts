import "server-only";
import {
	and,
	count,
	desc,
	eq,
	ilike,
	isNotNull,
	isNull,
	or,
	sql,
	type SQL,
} from "drizzle-orm";
import { db } from "@/db/client";
import { certificate } from "@/db/schema/certificate";
import { enrollment } from "@/db/schema/enrollment";
import { user as userTable } from "@/db/schema/auth";
import { course as courseTable } from "@/db/schema/course";

export async function getCertificateByEnrollmentId(enrollmentId: string) {
	const rows = await db
		.select()
		.from(certificate)
		.where(eq(certificate.enrollmentId, enrollmentId))
		.limit(1);
	return rows[0] ?? null;
}

export async function getCertificateByCode(certCode: string) {
	const rows = await db
		.select()
		.from(certificate)
		.where(eq(certificate.certCode, certCode))
		.limit(1);
	return rows[0] ?? null;
}

export interface AdminCertificateListItem {
	id: string;
	certCode: string;
	studentName: string;
	courseTitle: string;
	issuedAt: Date;
	revokedAt: Date | null;
}

export async function listAllCertificates(): Promise<
	AdminCertificateListItem[]
> {
	const rows = await db
		.select({
			id: certificate.id,
			certCode: certificate.certCode,
			studentName: userTable.name,
			courseTitle: courseTable.title,
			issuedAt: certificate.issuedAt,
			revokedAt: certificate.revokedAt,
		})
		.from(certificate)
		.innerJoin(enrollment, eq(certificate.enrollmentId, enrollment.id))
		.innerJoin(userTable, eq(enrollment.userId, userTable.id))
		.innerJoin(courseTable, eq(enrollment.courseId, courseTable.id))
		.orderBy(desc(certificate.issuedAt));

	return rows;
}

export type AdminCertificateStatus = "all" | "active" | "revoked";

export interface AdminCertificateListFilters {
	q?: string;
	status?: AdminCertificateStatus;
	page?: number;
	perPage?: number;
}

export interface AdminCertificateListPage {
	rows: Array<AdminCertificateListItem & { studentName: string }>;
	total: number;
	page: number;
	perPage: number;
	totalPages: number;
}

function buildCertFilter({
	q,
	status,
}: AdminCertificateListFilters): SQL | undefined {
	const conds: SQL[] = [];
	if (q && q.trim().length > 0) {
		const needle = `%${q.trim()}%`;
		const orExpr = or(
			ilike(certificate.certCode, needle),
			ilike(userTable.name, needle),
			ilike(courseTable.title, needle),
		);
		if (orExpr) conds.push(orExpr);
	}
	if (status === "active") conds.push(isNull(certificate.revokedAt));
	else if (status === "revoked") conds.push(isNotNull(certificate.revokedAt));
	if (conds.length === 0) return undefined;
	if (conds.length === 1) return conds[0];
	return and(...conds);
}

export async function listCertificatesPage(
	filters: AdminCertificateListFilters,
): Promise<AdminCertificateListPage> {
	const page = Math.max(1, filters.page ?? 1);
	const perPage = Math.min(100, Math.max(1, filters.perPage ?? 20));
	const where = buildCertFilter(filters);

	const baseSelect = db
		.select({
			id: certificate.id,
			certCode: certificate.certCode,
			studentName: userTable.name,
			courseTitle: courseTable.title,
			issuedAt: certificate.issuedAt,
			revokedAt: certificate.revokedAt,
		})
		.from(certificate)
		.innerJoin(enrollment, eq(certificate.enrollmentId, enrollment.id))
		.innerJoin(userTable, eq(enrollment.userId, userTable.id))
		.innerJoin(courseTable, eq(enrollment.courseId, courseTable.id));

	const baseCount = db
		.select({ n: sql<number>`count(*)::int` })
		.from(certificate)
		.innerJoin(enrollment, eq(certificate.enrollmentId, enrollment.id))
		.innerJoin(userTable, eq(enrollment.userId, userTable.id))
		.innerJoin(courseTable, eq(enrollment.courseId, courseTable.id));

	const [rows, countRows] = await Promise.all([
		(where ? baseSelect.where(where) : baseSelect)
			.orderBy(desc(certificate.issuedAt))
			.limit(perPage)
			.offset((page - 1) * perPage),
		where ? baseCount.where(where) : baseCount,
	]);

	const total = countRows[0]?.n ?? 0;
	return {
		rows: rows.map((r) => ({ ...r, studentName: r.studentName ?? "" })),
		total,
		page,
		perPage,
		totalPages: Math.max(1, Math.ceil(total / perPage)),
	};
}

export async function revokeCertificate(
	certId: string,
	adminUserId: string,
	reason: string,
): Promise<{ certCode: string } | null> {
	const [row] = await db
		.update(certificate)
		.set({
			revokedAt: new Date(),
			revokedByUserId: adminUserId,
			revokeReason: reason,
		})
		.where(eq(certificate.id, certId))
		.returning({ certCode: certificate.certCode });
	return row ?? null;
}

export interface CertificateListItem {
	certCode: string;
	courseTitle: string;
	issuedAt: Date;
	revokedAt: Date | null;
}

export async function listCertificatesByUserId(
	userId: string,
): Promise<CertificateListItem[]> {
	const rows = await db
		.select({
			certCode: certificate.certCode,
			courseTitle: courseTable.title,
			issuedAt: certificate.issuedAt,
			revokedAt: certificate.revokedAt,
		})
		.from(certificate)
		.innerJoin(enrollment, eq(certificate.enrollmentId, enrollment.id))
		.innerJoin(courseTable, eq(enrollment.courseId, courseTable.id))
		.where(eq(enrollment.userId, userId))
		.orderBy(certificate.issuedAt);

	return rows;
}

export interface VerifyCertificateResult {
	certCode: string;
	issuedAt: Date;
	revokedAt: Date | null;
	studentName: string;
	courseTitle: string;
	completedAt: Date;
}

export async function getCertificateForVerify(
	certCode: string,
): Promise<VerifyCertificateResult | null> {
	const certRows = await db
		.select({
			certCode: certificate.certCode,
			issuedAt: certificate.issuedAt,
			revokedAt: certificate.revokedAt,
			completedAt: enrollment.completedAt,
			studentName: userTable.name,
			courseTitle: courseTable.title,
		})
		.from(certificate)
		.innerJoin(enrollment, eq(certificate.enrollmentId, enrollment.id))
		.innerJoin(userTable, eq(enrollment.userId, userTable.id))
		.innerJoin(courseTable, eq(enrollment.courseId, courseTable.id))
		.where(eq(certificate.certCode, certCode))
		.limit(1);

	const row = certRows[0];
	if (!row) return null;

	return {
		certCode: row.certCode,
		issuedAt: row.issuedAt,
		revokedAt: row.revokedAt,
		studentName: row.studentName ?? "",
		courseTitle: row.courseTitle,
		completedAt: row.completedAt ?? new Date(),
	};
}

export async function createCertificate(input: {
	enrollmentId: string;
	certCode: string;
	pdfMediaId: string;
}) {
	const [row] = await db
		.insert(certificate)
		.values({
			enrollmentId: input.enrollmentId,
			certCode: input.certCode,
			pdfMediaId: input.pdfMediaId,
		})
		.returning({ id: certificate.id });
	return row!.id;
}

export async function countByUserId(userId: string): Promise<number> {
	const rows = await db
		.select({ n: count() })
		.from(certificate)
		.innerJoin(enrollment, eq(certificate.enrollmentId, enrollment.id))
		.where(eq(enrollment.userId, userId));
	return rows[0]?.n ?? 0;
}
