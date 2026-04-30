"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getSession } from "@/server/auth-session";
import {
	createAdminCourse,
	updateAdminCourse,
} from "@/server/repos/admin-course";
import { canEditCourse } from "@/server/services/course-authz";
import { getAdminCourseById } from "@/server/repos/admin-course";

const createSchema = z.object({
	slug: z.string().min(1).max(100),
	title: z.string().min(1).max(200),
	summary: z.string().min(1).max(500),
	description: z.string().max(10000).optional(),
	coverMediaId: z.string().uuid().optional(),
	// Price may be omitted when the course is free — disabled <input> elements
	// don't get serialised into FormData, so we fall back to "0.00".
	price: z
		.string()
		.regex(/^\d+(\.\d{1,2})?$/)
		.optional(),
	isFree: z.coerce.boolean(),
});

export async function createCourseAction(formData: FormData) {
	const session = await getSession();
	if (!session?.user?.id || session.user.role !== "admin") {
		return { ok: false, error: "unauthorized" as const };
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

	// Free courses always reset price to 0; the repo enforces this too,
	// but normalising here keeps the type narrow.
	const price = parsed.data.isFree ? "0.00" : (parsed.data.price ?? "0.00");
	const courseId = await createAdminCourse({
		slug: parsed.data.slug,
		title: parsed.data.title,
		summary: parsed.data.summary,
		descriptionMd: parsed.data.description || undefined,
		coverMediaId: parsed.data.coverMediaId || undefined,
		isFree: parsed.data.isFree,
		price,
		ownerUserId: session.user.id,
	});

	revalidatePath("/admin/courses");
	revalidatePath("/courses");

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
	const session = await getSession();
	if (!session?.user?.id) {
		return { ok: false, error: "unauthorized" as const };
	}

	const courseId = formData.get("courseId") as string;
	const courseRow = await getAdminCourseById(courseId);
	if (!courseRow) {
		return { ok: false, error: "not_found" as const };
	}

	const canEdit = await canEditCourse(
		session.user.id,
		session.user.role,
		courseId,
	);
	if (!canEdit) {
		return { ok: false, error: "forbidden" as const };
	}

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

	revalidatePath("/admin/courses");
	revalidatePath(`/admin/courses/${courseId}`);
	revalidatePath(`/admin/courses/${courseId}/curriculum`);
	revalidatePath(`/courses/${courseRow.slug}`);
	revalidatePath("/courses");

	return { ok: true };
}

import { db } from "@/db/client";
import { mediaAsset } from "@/db/schema/media";
import { eq } from "drizzle-orm";
import { deleteObject } from "@/server/services/r2";

export async function updateCourseCoverAction(formData: FormData) {
	const session = await getSession();
	if (!session?.user?.id) {
		return { ok: false, error: "unauthorized" as const };
	}

	const courseId = formData.get("courseId") as string;
	const mediaAssetId = formData.get("mediaAssetId") as string;

	const courseRow = await getAdminCourseById(courseId);
	if (!courseRow) {
		return { ok: false, error: "not_found" as const };
	}

	const canEdit = await canEditCourse(
		session.user.id,
		session.user.role,
		courseId,
	);
	if (!canEdit) {
		return { ok: false, error: "forbidden" as const };
	}

	// Cleanup old cover.
	const oldCoverMediaId = courseRow.coverMediaId;
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

	revalidatePath("/admin/courses");
	revalidatePath(`/admin/courses/${courseId}`);
	revalidatePath(`/courses/${courseRow.slug}`);
	revalidatePath("/courses");

	return { ok: true };
}
