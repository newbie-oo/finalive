"use server";

import { z } from "zod";
import { getSession } from "@/server/auth-session";
import { container } from "@/server/container";

const grantSchema = z.object({
	studentUserId: z.string().min(1),
	courseId: z.string().uuid(),
	reason: z.enum(["promo", "gift", "comp", "refund_replacement", "other"]),
	note: z.string().max(500).optional(),
});

export async function grantCourseAction(input: z.infer<typeof grantSchema>) {
	const session = await getSession();
	if (!session?.user?.id || session.user.role !== "admin") {
		return { ok: false, error: "unauthorized" as const };
	}

	const parsed = grantSchema.safeParse(input);
	if (!parsed.success) {
		return { ok: false, error: "invalid_input" as const };
	}

	try {
		const service = container.courseGrant();
		const result = await service.grant({
			adminUserId: session.user.id,
			studentUserId: parsed.data.studentUserId,
			courseId: parsed.data.courseId,
			reason: parsed.data.reason,
			note: parsed.data.note,
			baseUrl: container.baseUrl(),
		});
		return { ok: true, grantId: result.grantId };
	} catch (e: unknown) {
		if (e instanceof Error && e.message === "already_enrolled") {
			return { ok: false, error: "already_enrolled" as const };
		}
		throw e;
	}
}
