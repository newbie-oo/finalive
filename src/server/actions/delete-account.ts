"use server";

import { headers } from "next/headers";
import { auth } from "@/server/auth";

export interface DeleteAccountResult {
  ok: boolean;
  error?: "unauthorized" | "wrong_password" | "unknown";
}

/**
 * Deletes the currently signed-in user via Better-Auth.
 * - Credential users must pass their current password.
 * - Social-only users (no password) just confirm by signing the request.
 * The configured beforeDelete hook (server/auth.ts) cancels enrollments,
 * pending checkouts, and purges per-user progress before the user row is
 * removed; certificate rows survive so verification URLs still resolve.
 */
export async function deleteCurrentAccountAction(input: {
  password?: string;
}): Promise<DeleteAccountResult> {
  try {
    const reqHeaders = await headers();
    await auth.api.deleteUser({
      headers: reqHeaders,
      body: { password: input.password },
    });
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message.toLowerCase()
        : String(err).toLowerCase();
    if (message.includes("password") || message.includes("invalid")) {
      return { ok: false, error: "wrong_password" };
    }
    if (message.includes("unauthorized") || message.includes("session")) {
      return { ok: false, error: "unauthorized" };
    }
    return { ok: false, error: "unknown" };
  }
}
