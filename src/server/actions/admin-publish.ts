"use server";

import { z } from "zod";
import { eq, isNull, and } from "drizzle-orm";
import { db } from "@/db/client";
import { lesson, courseModule } from "@/db/schema/course";
import { updateAdminCourse } from "@/server/repos/admin-course";
import { getCourseCurriculum } from "@/server/repos/course";
import {
	isPlaceholderBody,
	isInsufficientBody,
} from "@/server/lib/lesson-content";
import {
	requireAdminSession,
	requireCourseAccess,
} from "@/server/admin/admin-command";

const publishSchema = z.object({
	courseId: z.string().uuid(),
});

export async function publishCourseAction(formData: FormData) {
	const auth = await requireAdminSession();
	if (!auth.ok) return { ok: false, error: auth.error } as const;

	const parsed = publishSchema.safeParse({
		courseId: formData.get("courseId"),
	});
	if (!parsed.success) {
		return { ok: false, error: "invalid_input" as const };
	}

	const { courseId } = parsed.data;

	const access = await requireCourseAccess(auth.session, courseId);
	if (!access.ok) return { ok: false, error: access.error } as const;

	const errors: string[] = [];

	if (!access.course.title.trim()) errors.push("ชื่อคอร์สว่างเปล่า");
	if (!access.course.summary.trim()) errors.push("คำอธิบายคอร์สว่างเปล่า");

	const curriculum = await getCourseCurriculum(courseId);
	if (curriculum.length === 0) errors.push("ยังไม่มีโมดูล");

	const totalLessons = curriculum.reduce((sum, m) => sum + m.lessons.length, 0);
	if (totalLessons === 0) errors.push("ยังไม่มีบทเรียน");

	if (totalLessons > 0) {
		const lessonRows = await db
			.select({
				id: lesson.id,
				title: lesson.title,
				bodyMd: lesson.bodyMd,
				videoMediaId: lesson.videoMediaId,
				moduleId: lesson.moduleId,
			})
			.from(lesson)
			.innerJoin(courseModule, eq(lesson.moduleId, courseModule.id))
			.where(
				and(
					eq(courseModule.courseId, courseId),
					isNull(lesson.deletedAt),
					isNull(courseModule.deletedAt),
				),
			);

		for (const ls of lessonRows) {
			if (isPlaceholderBody(ls.bodyMd)) {
				errors.push(`บทเรียน "${ls.title}" ยังเป็นเนื้อหา placeholder จาก seed`);
				continue;
			}
			if (!ls.videoMediaId && isInsufficientBody(ls.bodyMd)) {
				errors.push(`บทเรียน "${ls.title}" เนื้อหาว่างหรือสั้นเกินไป`);
			}
		}
	}

	if (errors.length > 0) {
		return { ok: false, error: "validation_failed" as const, errors };
	}

	await updateAdminCourse(courseId, {
		status: "published",
		publishedAt: new Date(),
	});

	return { ok: true };
}
