"use server";

import { headers } from "next/headers";
import { auth } from "@/server/auth";
import { hasCredentialAccount } from "@/server/repos/auth-account";

/**
 * Returns true if the current user has a credential (email/password) account.
 * Used to conditionally show the change-password section.
 */
export async function userHasCredentialAccount(): Promise<boolean> {
	try {
		const reqHeaders = await headers();
		const session = await auth.api.getSession({ headers: reqHeaders });
		if (!session?.user) return false;

		return hasCredentialAccount(session.user.id);
	} catch {
		return false;
	}
}
