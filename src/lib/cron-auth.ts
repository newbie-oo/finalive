import { getEnv } from "@/lib/env";

export function verifyCronSecret(authHeader: string | null): boolean {
  const secret = getEnv().CRON_SECRET;
  if (!secret) return false;
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : "";
  return bearer === secret;
}
