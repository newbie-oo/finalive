import { notFound } from "next/navigation";
import { getAdminLessonById } from "@/server/repos/admin-curriculum";
import { LessonEditor } from "@/components/admin/lesson-editor";

export const dynamic = "force-dynamic";

export default async function AdminLessonEditPage({
	params,
}: {
	params: Promise<{ id: string; lessonId: string }>;
}) {
	const { id, lessonId } = await params;

	const lesson = await getAdminLessonById(lessonId);
	if (!lesson) notFound();

	return (
		<div className="mx-auto max-w-3xl p-6">
			<LessonEditor courseId={id} lesson={lesson} />
		</div>
	);
}
