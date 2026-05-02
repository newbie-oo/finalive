import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { requireSession } from "@/server/auth-session";
import { db } from "@/db/client";
import { lesson, courseModule } from "@/db/schema/course";
import {
	updateWatchedSeconds,
	markLessonComplete,
} from "@/server/repos/progress";
import { checkAndMarkCourseComplete } from "@/server/repos/learn-completion";
import { CourseCompletionService } from "@/server/services/course-completion";
import {
	checkRateLimit,
	getClientIP,
	rateLimitConfigs,
} from "@/lib/rate-limit";

const schema = z.object({
	lessonId: z.string().uuid(),
	watchedSeconds: z.number().int().min(0),
	markComplete: z.boolean().optional(),
});

const COMPLETE_SENTINEL = 999_000;

export async function POST(req: Request) {
	const limit = checkRateLimit(
		getClientIP(req),
		"/api/learn/progress",
		rateLimitConfigs.api,
	);
	if (!limit.allowed) {
		return NextResponse.json({ code: "rate_limited" }, { status: 429 });
	}

	const { user } = await requireSession();
	// Admin previews must not record progress — otherwise an admin walking
	// through a course would auto-complete and trigger a certificate flow
	// they can never redeem.
	if (user.role === "admin") {
		return NextResponse.json({ ok: true, ignored: "admin_preview" });
	}
	let body: unknown;
	try {
		body = await req.json();
	} catch {
		return NextResponse.json({ code: "validation_failed" }, { status: 400 });
	}

	const parsed = schema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ code: "validation_failed" }, { status: 400 });
	}

	const { lessonId, watchedSeconds, markComplete } = parsed.data;
	const isComplete = markComplete || watchedSeconds >= COMPLETE_SENTINEL;

	if (isComplete) {
		const { CertificateIssuer } = await import(
			"@/server/certificates/certificate-issuer"
		);
		const { ReactPdfCertificateRenderer } = await import(
			"@/server/certificates/certificate-renderer"
		);
		const { R2ObjectStorage } = await import("@/server/services/storage");
		const { EmailCourseCompletionNotifier } = await import(
			"@/server/services/notifier"
		);

		const service = new CourseCompletionService({
			markLessonComplete,
			getCourseIdByLessonId: async (lid: string) => {
				const [row] = await db
					.select({ courseId: courseModule.courseId })
					.from(lesson)
					.innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
					.where(eq(lesson.id, lid))
					.limit(1);
				return row?.courseId ?? null;
			},
			checkAndMarkCourseComplete,
			certificateIssuer: new CertificateIssuer({
				renderer: new ReactPdfCertificateRenderer(),
				storage: new R2ObjectStorage("public"),
				notifier: new EmailCourseCompletionNotifier(),
			}),
		});

		const result = await service.handleLessonComplete({
			userId: user.id,
			userEmail: user.email,
			userRole: user.role,
			lessonId,
		});

		return NextResponse.json({ ok: true, ...result });
	} else {
		await updateWatchedSeconds(user.id, lessonId, watchedSeconds);
	}

	return NextResponse.json({ ok: true, completed: false });
}
