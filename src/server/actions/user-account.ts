"use server";

import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "@/server/auth";
import { db, schema } from "@/db/client";

/**
 * Returns true if the current user has a credential (email/password) account.
 * Used to conditionally show the change-password section.
 */
export async function userHasCredentialAccount(): Promise<boolean> {
  try {
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (!session?.user) return false;

    const accounts = await db
      .select()
      .from(schema.account)
      .where(eq(schema.account.userId, session.user.id));

    return accounts.some(
      (a) =>
        a.providerId === "credential" &&
        a.password !== null &&
        a.password !== undefined,
    );
  } catch {
    return false;
  }
}
