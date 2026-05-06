"use server";

import { z } from "zod";
import { revokeCertificate } from "@/server/repos/certificate";
import { adminAction, jsonParser } from "@/server/admin/admin-command";

const revokeSchema = z.object({
	certId: z.string().uuid(),
	reason: z.string().min(1),
});

export const revokeCertificateAction = adminAction(
	jsonParser(revokeSchema),
	async ({ session, input }) => {
		await revokeCertificate(input.certId, session.user.id, input.reason);
		return { ok: true as const };
	},
);
