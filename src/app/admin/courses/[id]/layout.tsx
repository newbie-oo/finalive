import { notFound } from "next/navigation";
import { getSession } from "@/server/auth-session";
import { getAdminCourseById } from "@/server/repos/admin-course";
import {
	getCourseOwnerId,
	getCollaboratorRole,
} from "@/server/repos/course-authz";
import { canEditCoursePure } from "@/server/services/course-authz";

export const dynamic = "force-dynamic";

export default async function AdminCourseLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;

	const session = await getSession();
	if (!session?.user?.id) {
		return (
			<div className="p-6">
				<p className="text-sm text-muted-foreground">กรุณาเข้าสู่ระบบ</p>
			</div>
		);
	}

	const course = await getAdminCourseById(id);
	if (!course) notFound();

	const [courseOwnerId, collaboratorRole] = await Promise.all([
		getCourseOwnerId(id),
		getCollaboratorRole(id, session.user.id),
	]);
	const canEdit = canEditCoursePure({
		userId: session.user.id,
		userRole: session.user.role,
		courseOwnerId,
		collaboratorRole,
	});
	if (!canEdit) {
		return (
			<div className="p-6">
				<p className="text-sm text-muted-foreground">ไม่มีสิทธิ์แก้ไขคอร์สนี้</p>
			</div>
		);
	}

	return <>{children}</>;
}
