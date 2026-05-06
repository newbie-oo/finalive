"use server";

import { z } from "zod";
import { container } from "@/server/container";
import { adminAction, jsonParser } from "@/server/admin/admin-command";

const grantSchema = z.object({
	studentUserId: z.string().min(1),
	courseId: z.string().uuid(),
	reason: z.enum(["promo", "gift", "comp", "refund_replacement", "other"]),
	note: z.string().max(500).optional(),
});

export const grantCourseAction = adminAction(
	jsonParser(grantSchema),
	async ({ session, input }) => {
		try {
			const service = container.courseGrant();
			const result = await service.grant({
				adminUserId: session.user.id,
				studentUserId: input.studentUserId,
				courseId: input.courseId,
				reason: input.reason,
				note: input.note,
				baseUrl: container.baseUrl(),
			});
			return { ok: true as const, grantId: result.grantId };
		} catch (e: unknown) {
			if (e instanceof Error && e.message === "already_enrolled") {
				return { ok: false as const, error: "already_enrolled" as const };
			}
			throw e;
		}
	},
);
