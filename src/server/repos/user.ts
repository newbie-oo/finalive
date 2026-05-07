import "server-only";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { user } from "@/db/schema/auth";

export interface UserListItem {
	id: string;
	email: string;
	name: string | null;
	role: string | null;
	createdAt: Date | null;
}

export interface UserListFilters {
	q?: string;
	role?: "admin" | "student" | "all";
	page?: number;
	perPage?: number;
}

export interface UserListPage {
	rows: UserListItem[];
	total: number;
	page: number;
	perPage: number;
	totalPages: number;
}

function buildUserFilter({ q, role }: UserListFilters): SQL | undefined {
	const conds: SQL[] = [];
	if (q && q.trim().length > 0) {
		const needle = `%${q.trim()}%`;
		const orExpr = or(ilike(user.name, needle), ilike(user.email, needle));
		if (orExpr) conds.push(orExpr);
	}
	if (role === "admin") conds.push(eq(user.role, "admin"));
	else if (role === "student")
		conds.push(or(eq(user.role, "student"), sql`${user.role} is null`)!);
	if (conds.length === 0) return undefined;
	if (conds.length === 1) return conds[0];
	return and(...conds);
}

export const UserRepo = {
	async listAll(): Promise<UserListItem[]> {
		return db
			.select({
				id: user.id,
				email: user.email,
				name: user.name,
				role: user.role,
				createdAt: user.createdAt,
			})
			.from(user)
			.orderBy(desc(user.createdAt));
	},

	async listPage(filters: UserListFilters): Promise<UserListPage> {
		const page = Math.max(1, filters.page ?? 1);
		const perPage = Math.min(100, Math.max(1, filters.perPage ?? 20));
		const where = buildUserFilter(filters);

		const baseSelect = db
			.select({
				id: user.id,
				email: user.email,
				name: user.name,
				role: user.role,
				createdAt: user.createdAt,
			})
			.from(user);

		const baseCount = db
			.select({ n: sql<number>`count(*)::int` })
			.from(user);

		const [rows, countRows] = await Promise.all([
			(where ? baseSelect.where(where) : baseSelect)
				.orderBy(desc(user.createdAt))
				.limit(perPage)
				.offset((page - 1) * perPage),
			where ? baseCount.where(where) : baseCount,
		]);

		const total = countRows[0]?.n ?? 0;
		return {
			rows,
			total,
			page,
			perPage,
			totalPages: Math.max(1, Math.ceil(total / perPage)),
		};
	},

	async getById(id: string): Promise<UserListItem | undefined> {
		const rows = await db
			.select({
				id: user.id,
				email: user.email,
				name: user.name,
				role: user.role,
				createdAt: user.createdAt,
			})
			.from(user)
			.where(eq(user.id, id))
			.limit(1);
		return rows[0];
	},

	async getContact(
		userId: string,
	): Promise<{ email: string; name: string | null } | null> {
		const rows = await db
			.select({ email: user.email, name: user.name })
			.from(user)
			.where(eq(user.id, userId))
			.limit(1);
		return rows[0] ?? null;
	},

	async getNameById(userId: string): Promise<string | null> {
		const rows = await db
			.select({ name: user.name })
			.from(user)
			.where(eq(user.id, userId))
			.limit(1);
		return rows[0]?.name ?? null;
	},

	async getRoleById(userId: string): Promise<string | null> {
		const rows = await db
			.select({ role: user.role })
			.from(user)
			.where(eq(user.id, userId))
			.limit(1);
		return rows[0]?.role ?? null;
	},
};
