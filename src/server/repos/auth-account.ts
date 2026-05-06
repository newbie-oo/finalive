import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { account } from "@/db/schema/auth";

export async function hasCredentialAccount(userId: string): Promise<boolean> {
	const rows = await db
		.select()
		.from(account)
		.where(eq(account.userId, userId));

	return rows.some(
		(a) =>
			a.providerId === "credential" &&
			a.password !== null &&
			a.password !== undefined,
	);
}
