import { STUDENT_NAV, ADMIN_NAV } from "@/lib/navigation";
import { AppHeader } from "./app-header";
import type { SessionUser } from "@/server/auth-session";

export function StudentShell({
	user,
	children,
}: {
	user: SessionUser;
	children: React.ReactNode;
}) {
	return (
		<div className="flex min-h-full flex-col">
			<a
				href="#main"
				className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:rounded-md focus:bg-(--primary) focus:px-3 focus:py-2 focus:text-(--primary-fg)"
			>
				ข้ามไปยังเนื้อหา
			</a>
			<AppHeader
				navItems={user.role === "admin" ? ADMIN_NAV : STUDENT_NAV}
				user={user}
			/>
			<main
				id="main"
				className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-8"
			>
				{children}
			</main>
		</div>
	);
}
