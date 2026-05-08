import { notFound } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/server/auth-session";
import { UserRepo } from "@/server/repos/user";
import { EnrollmentRepo } from "@/server/repos/enrollment";
import { AdminGrantRepo } from "@/server/repos/admin-grant";
import { listGrantableCoursesForUser } from "@/server/repos/admin-course";
import { GrantDialog } from "@/components/admin/grant-dialog";
import { AvatarInitials } from "@/components/ui/avatar-initials";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AdminUserDetailPage({
	params,
}: {
	params: Promise<{ id: string }>;
}) {
	const { id } = await params;

	const session = await getSession();
	if (!session?.user?.id || session.user.role !== "admin") {
		return <p className="text-body text-muted-foreground">ไม่มีสิทธิ์เข้าถึง</p>;
	}

	const userRow = await UserRepo.getById(id);
	if (!userRow) notFound();

	const enrollments = await EnrollmentRepo.listByUserId(id);
	const grants = await AdminGrantRepo.listByStudentId(id);
	const courses = await listGrantableCoursesForUser(id);

	return (
		<section className="mx-auto max-w-3xl space-y-6">
			<header className="flex items-start justify-between gap-4">
				<div className="flex items-center gap-4">
					<AvatarInitials name={userRow.name ?? ""} size="lg" />
					<div>
						<h1 className="text-h1">{userRow.name ?? ""}</h1>
						<p className="mt-1 text-body text-muted-foreground">
							{userRow.email} ·{" "}
							<span className="text-foreground">
								{(userRow.role ?? "") === "admin" ? "ผู้ดูแล" : "นักเรียน"}
							</span>
						</p>
					</div>
				</div>
				<Link
					href="/admin/users"
					className="text-uism font-medium text-primary hover:underline"
				>
					← กลับไปรายชื่อ
				</Link>
			</header>

			<Card className="flex items-center justify-between gap-4">
				<div>
					<p className="text-uism text-muted-foreground">สมัครเมื่อ</p>
					<p className="num text-body font-medium text-foreground">
						{userRow.createdAt?.toLocaleDateString("th-TH")}
					</p>
				</div>
				<GrantDialog studentUserId={id} courses={courses} />
			</Card>

			<div className="space-y-3">
				<h2 className="text-h3">การลงทะเบียน</h2>
				{enrollments.length === 0 ? (
					<p className="text-body text-muted-foreground">
						ยังไม่มีการลงทะเบียน
					</p>
				) : (
					<ul className="space-y-2">
						{enrollments.map((e) => (
							<li
								key={e.id}
								className="rounded-card border border-border bg-card p-4 text-ui"
							>
								<div className="font-medium text-foreground">
									{e.courseTitle}
								</div>
								<div className="text-uism text-muted-foreground">
									{e.source} · {e.status} ·{" "}
									{e.createdAt?.toLocaleDateString("th-TH")}
								</div>
							</li>
						))}
					</ul>
				)}
			</div>

			<div className="space-y-3">
				<h2 className="text-h3">ประวัติการให้สิทธิ์</h2>
				{grants.length === 0 ? (
					<p className="text-body text-muted-foreground">ยังไม่มีประวัติ</p>
				) : (
					<ul className="space-y-2">
						{grants.map((g) => (
							<li
								key={g.id}
								className="rounded-card border border-border bg-card p-4 text-ui"
							>
								<div className="font-medium text-foreground">
									{g.courseTitle}
								</div>
								<div className="text-uism text-muted-foreground">
									{g.reason}
									{g.note ? ` · ${g.note}` : ""} ·{" "}
									{g.grantedAt?.toLocaleDateString("th-TH")}
								</div>
							</li>
						))}
					</ul>
				)}
			</div>
		</section>
	);
}
