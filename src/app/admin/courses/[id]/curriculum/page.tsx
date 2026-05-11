import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminCourseById } from "@/server/repos/admin-course";
import { getAdminCourseCurriculum } from "@/server/repos/admin-curriculum";
import { CurriculumTree } from "@/components/admin/curriculum-tree";
import { PublishButton } from "@/components/admin/publish-button";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminCurriculumPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;

	const course = await getAdminCourseById(id);
	if (!course) notFound();

	const curriculum = await getAdminCourseCurriculum(id);

	return (
		<section className="space-y-6">
			<header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-h1">จัดการเนื้อหา</h1>
					<p className="mt-1 text-body text-muted-foreground">
						{course.title}
					</p>
				</div>
				<div className="flex gap-2">
					<PublishButton courseId={id} currentStatus={course.status} />
					<Button asChild variant="ghost" size="md">
						<Link href={`/admin/courses/${id}`}>← กลับไปคอร์ส</Link>
					</Button>
				</div>
			</header>

			<CurriculumTree courseId={id} modules={curriculum} />
		</section>
	);
}
