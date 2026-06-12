"use server";

import { z } from "zod";
import {
	createAdminCourse,
	updateAdminCourse,
} from "@/server/repos/admin-course";
import {
	normalizeCoursePrice,
	normalizeCoursePriceRequired,
} from "@/server/services/course-price";
import {
	adminAction,
	adminCourseAction,
	formDataParser,
	jsonParser,
	revalidateCourseAdminPaths,
} from "@/server/admin/admin-command";
import { container } from "@/server/container";
import { COURSE_STATUS } from "@/db/schema/course";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const createSchema = z.object({
	slug: z
		.string()
		.min(1)
		.max(100)
		.regex(slugRegex, "slug ต้องเป็นตัวพิมพ์เล็ก ตัวเลข และขีดกลางเท่านั้น"),
	title: z.string().min(1).max(200),
	summary: z.string().min(1).max(500),
	description: z.string().max(10000).optional(),
	coverMediaId: z.string().uuid().optional(),
	price: z
		.string()
		.regex(/^\d+(\.\d{1,2})?$/)
		.optional(),
	isFree: z.coerce.boolean(),
});

export const createCourseAction = adminAction(
	jsonParser(createSchema),
	async ({ session, input }) => {
		const { price, isFree } = normalizeCoursePriceRequired({
			price: input.price ?? "0.00",
			isFree: input.isFree,
		});
		const courseId = await createAdminCourse({
			slug: input.slug,
			title: input.title,
			summary: input.summary,
			descriptionMd: input.description || undefined,
			coverMediaId: input.coverMediaId || undefined,
			isFree,
			price,
			ownerUserId: session.user.id,
		});
		revalidateCourseAdminPaths(courseId);
		return { courseId };
	},
);

const updateSchema = z.object({
	courseId: z.string().uuid(),
	slug: z
		.string()
		.min(1)
		.max(100)
		.regex(slugRegex, "slug ต้องเป็นตัวพิมพ์เล็ก ตัวเลข และขีดกลางเท่านั้น")
		.optional(),
	title: z.string().min(1).max(200).optional(),
	summary: z.string().min(1).max(500).optional(),
	price: z
		.string()
		.regex(/^\d+(\.\d{1,2})?$/)
		.optional(),
	isFree: z.coerce.boolean().optional(),
	status: z.enum(COURSE_STATUS).optional(),
});

export const updateCourseAction = adminCourseAction(
	jsonParser(updateSchema),
	(input) => input.courseId,
	async ({ course, input }) => {
		const { courseId: _, ...updates } = input;
		const normalised = normalizeCoursePrice({
			price: updates.price,
			isFree: updates.isFree,
		});
		await updateAdminCourse(course.id, {
			...(updates.slug !== undefined && { slug: updates.slug }),
			...(updates.title !== undefined && { title: updates.title }),
			...(updates.summary !== undefined && { summary: updates.summary }),
			...(normalised.price !== undefined && { price: normalised.price }),
			...(normalised.isFree !== undefined && { isFree: normalised.isFree }),
			...(updates.status !== undefined && { status: updates.status }),
		});

		if (updates.slug && updates.slug !== course.slug) {
			revalidateCourseAdminPaths(course.id, course.slug);
			revalidateCourseAdminPaths(course.id, updates.slug);
		} else {
			revalidateCourseAdminPaths(course.id, course.slug);
		}
		return {};
	},
);

export const updateCourseCoverAction = adminCourseAction(
	jsonParser(
		z.object({
			courseId: z.string().uuid(),
			mediaAssetId: z.string().uuid(),
		}),
	),
	(input) => input.courseId,
	async ({ course, input }) => {
		const service = container.coverImage();
		await service.replaceCover({
			courseId: course.id,
			newMediaAssetId: input.mediaAssetId,
			oldCoverMediaId: course.coverMediaId,
		});
		revalidateCourseAdminPaths(course.id, course.slug);
		return {};
	},
);
