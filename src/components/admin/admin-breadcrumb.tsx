"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CaretRight, House } from "@phosphor-icons/react";

interface Crumb {
	label: string;
	href: string;
}

const LABEL_MAP: Record<string, string> = {
	admin: "แดชบอร์ด",
	courses: "คอร์ส",
	users: "ผู้ใช้",
	slips: "ตรวจสลิป",
	certificates: "ใบประกาศ",
	curriculum: "หลักสูตร",
	lessons: "บทเรียน",
	quizzes: "แบบทดสอบ",
	new: "สร้างใหม่",
};

export function AdminBreadcrumb() {
	const pathname = usePathname() ?? "";
	if (!pathname.startsWith("/admin")) return null;

	const segments = pathname.split("/").filter(Boolean);
	const crumbs: Crumb[] = [];

	let href = "";
	for (let i = 0; i < segments.length; i++) {
		const seg = segments[i];
		if (!seg) continue;
		href += `/${seg}`;
		const label =
			LABEL_MAP[seg] ?? (seg.length > 20 ? `${seg.slice(0, 18)}…` : seg);
		crumbs.push({ label, href });
	}

	if (crumbs.length <= 1) return null;

	return (
		<nav
			aria-label="Breadcrumb"
			className="flex items-center gap-1.5 text-uism text-(--foreground-muted)"
		>
			<Link
				href="/admin"
				className="inline-flex items-center gap-1 rounded-nav px-1.5 py-1 transition-colors hover:bg-(--surface-muted) hover:text-(--foreground)"
			>
				<House size={14} />
				<span className="sr-only">แดชบอร์ด</span>
			</Link>
			{crumbs.slice(1).map((crumb, idx) => {
				const isLast = idx === crumbs.length - 2;
				return (
					<span key={crumb.href} className="flex items-center gap-1.5">
						<CaretRight size={12} className="text-(--foreground-subtle)" />
						{isLast ? (
							<span
								className="rounded-nav px-1.5 py-1 font-medium text-(--foreground)"
								aria-current="page"
							>
								{crumb.label}
							</span>
						) : (
							<Link
								href={crumb.href}
								className="rounded-nav px-1.5 py-1 transition-colors hover:bg-(--surface-muted) hover:text-(--foreground)"
							>
								{crumb.label}
							</Link>
						)}
					</span>
				);
			})}
		</nav>
	);
}
