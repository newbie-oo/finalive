import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

export type Role = "admin" | "user";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  emailVerified: boolean;
}

export interface SessionContext {
  user: SessionUser;
  sessionId: string;
}

function normalizeRole(role: string | null | undefined): Role {
  return role === "admin" ? "admin" : "user";
}

function getUserRole(user: unknown): string | null | undefined {
  if (typeof user !== "object" || user === null) return undefined;
  const role = (user as Record<string, unknown>).role;
  if (typeof role === "string" || role === null) return role;
  return undefined;
}

export async function getSession(): Promise<SessionContext | null> {
  const result = await auth.api.getSession({ headers: await headers() });
  if (!result?.user || !result.session) return null;
  return {
    sessionId: result.session.id,
    user: {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: normalizeRole(getUserRole(result.user)),
      emailVerified: result.user.emailVerified,
    },
  };
}

export async function requireSession(redirectTo = "/login"): Promise<SessionContext> {
  const ctx = await getSession();
  if (!ctx) redirect(redirectTo);
  return ctx;
}

export async function requireRole(
  role: Role,
  redirectTo = "/login",
): Promise<SessionContext> {
  const ctx = await requireSession(redirectTo);
  if (ctx.user.role !== role) redirect("/403");
  return ctx;
}
