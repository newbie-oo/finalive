"use server";

import { z } from "zod";
import { eq } from "drizzle-orm";
import {
	createAdminCourse,
	updateAdminCourse,
} from "@/server/repos/admin-course";
import {
	requireAdminSession,
	requireCourseAccess,
	revalidateCourseAdminPaths,
} from "@/server/admin/admin-command";
import { db } from "@/db/client";
import { mediaAsset } from "@/db/schema/media";
import { R2ObjectStorage } from "@/server/services/storage";
import { CoverImageService } from "@/server/services/cover-image";
import { CourseAdminService } from "@/server/services/course-admin";

const createSchema = z.object({
	slug: z.string().min(1).max(100),
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

function makeCourseService() {
	return new CourseAdminService({
		createCourse: createAdminCourse,
		updateCourse: updateAdminCourse,
	});
}

export async function createCourseAction(formData: FormData) {
	const auth = await requireAdminSession();
	if (!auth.ok) return { ok: false, error: auth.error } as const;
	if (auth.session.user.role !== "admin") {
		return { ok: false, error: "forbidden" as const };
	}

	const parsed = createSchema.safeParse({
		slug: formData.get("slug"),
		title: formData.get("title"),
		summary: formData.get("summary"),
		description: formData.get("description") ?? undefined,
		coverMediaId: formData.get("coverMediaId") ?? undefined,
		price: formData.get("price") ?? undefined,
		isFree: formData.get("isFree"),
	});

	if (!parsed.success) {
		return { ok: false, error: "invalid_input" as const };
	}

	const service = makeCourseService();
	const courseId = await service.create({
		...parsed.data,
		ownerUserId: auth.session.user.id,
	});

	revalidateCourseAdminPaths(courseId);
	return { ok: true, courseId };
}

const updateSchema = z.object({
	courseId: z.string().uuid(),
	title: z.string().min(1).max(200).optional(),
	summary: z.string().min(1).max(500).optional(),
	price: z
		.string()
		.regex(/^\d+(\.\d{1,2})?$/)
		.optional(),
	isFree: z.coerce.boolean().optional(),
	status: z.enum(["draft", "published", "archived"]).optional(),
});

export async function updateCourseAction(formData: FormData) {
	const auth = await requireAdminSession();
	if (!auth.ok) return { ok: false, error: auth.error } as const;

	const courseId = formData.get("courseId") as string;
	const access = await requireCourseAccess(auth.session, courseId);
	if (!access.ok) return { ok: false, error: access.error } as const;

	const raw: Record<string, unknown> = { courseId };
	for (const key of [
		"title",
		"summary",
		"price",
		"isFree",
		"status",
	] as const) {
		const val = formData.get(key);
		if (val !== null) raw[key] = val;
	}

	const parsed = updateSchema.safeParse(raw);
	if (!parsed.success) {
		return { ok: false, error: "invalid_input" as const };
	}

	const { courseId: _, ...updates } = parsed.data;
	const service = makeCourseService();
	await service.update(courseId, updates);

	revalidateCourseAdminPaths(courseId, access.course.slug);
	return { ok: true };
}

function makeCoverService() {
	return new CoverImageService({
		storage: new R2ObjectStorage("public"),
		getMediaAsset: async (mediaAssetId) => {
			const rows = await db
				.select({ id: mediaAsset.id, storageKey: mediaAsset.storageKey })
				.from(mediaAsset)
				.where(eq(mediaAsset.id, mediaAssetId))
				.limit(1);
			return rows[0] ?? null;
		},
		deleteMediaAsset: async (mediaAssetId) => {
			await db.delete(mediaAsset).where(eq(mediaAsset.id, mediaAssetId));
		},
		updateCourseCover: async (courseId, mediaAssetId) => {
			await updateAdminCourse(courseId, { coverMediaId: mediaAssetId });
		},
	});
}

export async function updateCourseCoverAction(formData: FormData) {
	const auth = await requireAdminSession();
	if (!auth.ok) return { ok: false, error: auth.error } as const;

	const courseId = formData.get("courseId") as string;
	const mediaAssetId = formData.get("mediaAssetId") as string;

	const access = await requireCourseAccess(auth.session, courseId);
	if (!access.ok) return { ok: false, error: access.error } as const;

	const service = makeCoverService();
	await service.replaceCover({
		courseId,
		newMediaAssetId: mediaAssetId,
		oldCoverMediaId: access.course.coverMediaId,
	});

	revalidateCourseAdminPaths(courseId, access.course.slug);
	return { ok: true };
}
