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
import { deleteObject } from "@/server/services/r2";

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

export async function createCourseAction(formData: FormData) {
	const auth = await requireAdminSession();
	if (!auth.ok) return { ok: false, error: auth.error } as const;
	// Course creation is admin-only.
	if (auth.session.user.role !== "admin") {
		return { ok: false, error: "forbidden" as const };
	}

	const rawPrice = formData.get("price");
	const parsed = createSchema.safeParse({
		slug: formData.get("slug"),
		title: formData.get("title"),
		summary: formData.get("summary"),
		description: formData.get("description") ?? undefined,
		coverMediaId: formData.get("coverMediaId") ?? undefined,
		price: rawPrice ?? undefined,
		isFree: formData.get("isFree"),
	});

	if (!parsed.success) {
		return { ok: false, error: "invalid_input" as const };
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
	await updateAdminCourse(courseId, updates);

	revalidateCourseAdminPaths(courseId, access.course.slug);
	return { ok: true };
}

export async function updateCourseCoverAction(formData: FormData) {
	const auth = await requireAdminSession();
	if (!auth.ok) return { ok: false, error: auth.error } as const;

	const courseId = formData.get("courseId") as string;
	const mediaAssetId = formData.get("mediaAssetId") as string;

	const access = await requireCourseAccess(auth.session, courseId);
	if (!access.ok) return { ok: false, error: access.error } as const;

	// Cleanup old cover.
	const oldCoverMediaId = access.course.coverMediaId;
	if (oldCoverMediaId) {
		const oldAssets = await db
			.select({ id: mediaAsset.id, storageKey: mediaAsset.storageKey })
			.from(mediaAsset)
			.where(eq(mediaAsset.id, oldCoverMediaId))
			.limit(1);
		const oldAsset = oldAssets[0];
		if (oldAsset) {
			try {
				const uuid = oldAsset.storageKey;
				await deleteObject({
					bucket: "public",
					key: `covers/${uuid}-640.webp`,
				});
				await deleteObject({
					bucket: "public",
					key: `covers/${uuid}-1200.webp`,
				});
			} catch (err) {
				console.error("Failed to delete old cover from R2:", err);
			}
			await db.delete(mediaAsset).where(eq(mediaAsset.id, oldAsset.id));
		}
	}

	await updateAdminCourse(courseId, { coverMediaId: mediaAssetId });

	revalidateCourseAdminPaths(courseId, access.course.slug);
	return { ok: true };
}
