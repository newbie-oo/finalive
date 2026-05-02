"use server";

import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/server/auth-session";
import { db } from "@/db/client";
import { enrollment, adminGrant } from "@/db/schema/enrollment";
import { course } from "@/db/schema/course";
import { user } from "@/db/schema/auth";
import { sendGrantCourseEmail } from "@/server/services/mailer";
import { getEnv } from "@/lib/env";
import { CourseGrantService } from "@/server/services/course-grant";

const grantSchema = z.object({
	studentUserId: z.string().min(1),
	courseId: z.string().uuid(),
	reason: z.enum(["promo", "gift", "comp", "refund_replacement", "other"]),
	note: z.string().max(500).optional(),
});

function makeService() {
	return new CourseGrantService({
		hasActiveEnrollment: async (studentUserId, courseId) => {
			const rows = await db
				.select({ id: enrollment.id })
				.from(enrollment)
				.where(
					and(
						eq(enrollment.userId, studentUserId),
						eq(enrollment.courseId, courseId),
						eq(enrollment.status, "active"),
					),
				)
				.limit(1);
			return rows.length > 0;
		},
		createGrant: async (args) => {
			const [row] = await db
				.insert(adminGrant)
				.values({
					adminUserId: args.adminUserId,
					studentUserId: args.studentUserId,
					courseId: args.courseId,
					reason: args.reason,
					note: args.note,
				})
				.returning({ id: adminGrant.id });
			return row!.id;
		},
		createEnrollment: async (args) => {
			await db.insert(enrollment).values({
				userId: args.userId,
				courseId: args.courseId,
				source: "admin_grant",
				sourceGrantId: args.grantId,
				status: "active",
			});
		},
		getStudentContact: async (userId) => {
			const rows = await db
				.select({ email: user.email, name: user.name })
				.from(user)
				.where(eq(user.id, userId))
				.limit(1);
			return rows[0] ?? null;
		},
		getCourseInfo: async (courseId) => {
			const rows = await db
				.select({ title: course.title, slug: course.slug })
				.from(course)
				.where(eq(course.id, courseId))
				.limit(1);
			return rows[0] ?? null;
		},
		sendNotification: async (n) => {
			await sendGrantCourseEmail({
				to: n.to,
				name: n.name ?? "",
				courseTitle: n.courseTitle,
				learnUrl: n.learnUrl,
			});
		},
	});
}

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
		const service = makeService();
		const result = await service.grant({
			adminUserId: session.user.id,
			studentUserId: parsed.data.studentUserId,
			courseId: parsed.data.courseId,
			reason: parsed.data.reason,
			note: parsed.data.note,
			baseUrl: getEnv().BETTER_AUTH_URL.replace(/\/$/, ""),
		});
		return { ok: true, grantId: result.grantId };
	} catch (e: unknown) {
		if (e instanceof Error && e.message === "already_enrolled") {
			return { ok: false, error: "already_enrolled" as const };
		}
		throw e;
	}
}
