"use server";

import { z } from "zod";
import {
	createAdminCourse,
	updateAdminCourse,
} from "@/server/repos/admin-course";
import {
	requireAdminSession,
	requireCourseAccess,
	revalidateCourseAdminPaths,
} from "@/server/admin/admin-command";
import { container } from "@/server/container";

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
		const issue = parsed.error.issues[0];
		if (!issue) return { ok: false, error: "invalid_input" };
		const field = issue.path.join(".");
		return { ok: false, error: `invalid_input (${field}): ${issue.message}` };
	}

	const price = parsed.data.isFree ? "0.00" : (parsed.data.price ?? "0.00");
	const courseId = await createAdminCourse({
		slug: parsed.data.slug,
		title: parsed.data.title,
		summary: parsed.data.summary,
		descriptionMd: parsed.data.description || undefined,
		coverMediaId: parsed.data.coverMediaId || undefined,
		isFree: parsed.data.isFree,
		price,
		ownerUserId: auth.session.user.id,
	});

	revalidateCourseAdminPaths(courseId);
	return { ok: true, courseId };
}

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
		"slug",
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
		const issue = parsed.error.issues[0];
		if (!issue) return { ok: false, error: "invalid_input" };
		const field = issue.path.join(".");
		return { ok: false, error: `invalid_input (${field}): ${issue.message}` };
	}

	const { courseId: _, ...updates } = parsed.data;
	await updateAdminCourse(courseId, {
		...(updates.slug !== undefined && { slug: updates.slug }),
		...(updates.title !== undefined && { title: updates.title }),
		...(updates.summary !== undefined && { summary: updates.summary }),
		...(updates.price !== undefined && { price: updates.price }),
		...(updates.isFree !== undefined && { isFree: updates.isFree }),
		...(updates.status !== undefined && { status: updates.status }),
	});

	// Revalidate old slug path if slug changed
	if (updates.slug && updates.slug !== access.course.slug) {
		revalidateCourseAdminPaths(courseId, access.course.slug);
		revalidateCourseAdminPaths(courseId, updates.slug);
	} else {
		revalidateCourseAdminPaths(courseId, access.course.slug);
	}
	return { ok: true };
}

export async function updateCourseCoverAction(formData: FormData) {
	const auth = await requireAdminSession();
	if (!auth.ok) return { ok: false, error: auth.error } as const;

	const courseId = formData.get("courseId") as string;
	const mediaAssetId = formData.get("mediaAssetId") as string;

	const access = await requireCourseAccess(auth.session, courseId);
	if (!access.ok) return { ok: false, error: access.error } as const;

	const service = container.coverImage();
	await service.replaceCover({
		courseId,
		newMediaAssetId: mediaAssetId,
		oldCoverMediaId: access.course.coverMediaId,
	});

	revalidateCourseAdminPaths(courseId, access.course.slug);
	return { ok: true };
}
