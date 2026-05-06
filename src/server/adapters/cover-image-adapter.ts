import { updateAdminCourse } from "@/server/repos/admin-course";

export async function updateCourseCover(
	courseId: string,
	mediaAssetId: string | null,
): Promise<void> {
	await updateAdminCourse(courseId, { coverMediaId: mediaAssetId });
}
