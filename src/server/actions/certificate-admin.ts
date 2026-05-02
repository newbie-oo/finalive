"use server";

import { getSession } from "@/server/auth-session";
import { revokeCertificate } from "@/server/repos/certificate";

export async function revokeCertificateAction(certId: string, reason: string) {
  const session = await getSession();
  if (!session?.user?.id || session.user.role !== "admin") {
    return { ok: false, error: "unauthorized" as const };
  }

  if (!reason.trim()) {
    return { ok: false, error: "reason_required" as const };
  }

  await revokeCertificate(certId, session.user.id, reason.trim());
  return { ok: true };
}
