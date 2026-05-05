import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSession } from "@/server/auth-session";
import { updateWatchedSeconds } from "@/server/repos/progress";
import { container } from "@/server/container";
import {
	checkRateLimit,
	getClientIP,
	rateLimitConfigs,
} from "@/lib/rate-limit";

const schema = z.object({
	lessonId: z.string().uuid(),
	watchedSeconds: z.number().int().min(0),
	markComplete: z.boolean().optional(),
	durationSeconds: z.number().int().min(0).optional(),
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
		const service = container.courseCompletion();
		const result = await service.handleLessonComplete({
			userId: user.id,
			userEmail: user.email,
			userRole: user.role,
			lessonId,
			durationSeconds: parsed.data.durationSeconds,
		});
		return NextResponse.json({ ok: true, ...result });
	}

	await updateWatchedSeconds(user.id, lessonId, watchedSeconds);
	return NextResponse.json({ ok: true, completed: false });
}
