"use server";

import { revalidatePath } from "next/cache";
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
		const revoked = await revokeCertificate(
			input.certId,
			session.user.id,
			input.reason,
		);
		revalidatePath("/admin/certificates");
		if (revoked) {
			revalidatePath(`/verify/${revoked.certCode}`);
		}
		return { ok: true as const };
	},
);
