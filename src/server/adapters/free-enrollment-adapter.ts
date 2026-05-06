import { getPublishedCourseBySlug } from "@/server/repos/course";
import { EnrollmentRepo } from "@/server/repos/enrollment";

export async function getCourseBySlugForEnrollment(
	slug: string,
): Promise<
	{ id: string; slug: string; isFree: boolean; status: string } | undefined
> {
	const row = await getPublishedCourseBySlug(slug, {
		includeUnpublished: true,
	});
	if (!row) return undefined;
	return { id: row.id, slug: row.slug, isFree: row.isFree, status: row.status };
}

export async function createActiveEnrollment(args: {
	userId: string;
	courseId: string;
	source: string;
	priceAtPurchase: string;
}): Promise<void> {
	await EnrollmentRepo.create({ ...args, status: "active" });
}
