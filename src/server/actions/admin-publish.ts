"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
	getCourseMetaForPublish,
	getLessonsForPublish,
} from "@/server/repos/publish";
import { getCourseCurriculum } from "@/server/repos/course";
import { updateAdminCourse } from "@/server/repos/admin-course";
import { CoursePublishValidator } from "@/server/services/course-publish-validator";
import {
	adminCourseAction,
	formDataParser,
	jsonParser,
	revalidateCourseAdminPaths,
} from "@/server/admin/admin-command";

const publishSchema = z.object({
	courseId: z.string().uuid(),
});

function makePublishValidator() {
	return new CoursePublishValidator({
		getCourseMeta: getCourseMetaForPublish,
		getCurriculum: getCourseCurriculum,
		getLessons: getLessonsForPublish,
	});
}

export const publishCourseAction = adminCourseAction(
	jsonParser(publishSchema),
	(input) => input.courseId,
	async ({ course, input }) => {
		const validator = makePublishValidator();
		const result = await validator.validate(input.courseId);
		if (!result.ok) {
			return {
				ok: false as const,
				error: "validation_failed" as const,
				errors: result.errors,
			};
		}

		await updateAdminCourse(input.courseId, {
			status: "published",
			publishedAt: new Date(),
		});

		revalidateCourseAdminPaths(input.courseId, course.slug);
		revalidatePath("/sitemap.xml");

		return { ok: true as const };
	},
);
