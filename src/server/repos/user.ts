import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { user } from "@/db/schema/auth";

export const UserRepo = {
	async listAll(): Promise<
		Array<{
			id: string;
			email: string;
			name: string | null;
			role: string | null;
			createdAt: Date | null;
		}>
	> {
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

	async getById(id: string): Promise<
		| {
				id: string;
				email: string;
				name: string | null;
				role: string | null;
				createdAt: Date | null;
		  }
		| undefined
	> {
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
