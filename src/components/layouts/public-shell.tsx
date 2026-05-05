"use client";

import Link from "next/link";
import { useState } from "react";
import { YoutubeLogo } from "@phosphor-icons/react";
import { useSession } from "@/lib/auth-client";
import { visibleNav } from "@/lib/navigation";
import { AppHeader } from "./app-header";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

const FOOTER_COLS: Array<{
	heading: string;
	links: Array<{ label: string; href: string }>;
}> = [
	{
		heading: "ผลิตภัณฑ์",
		links: [
			{ label: "คอร์สทั้งหมด", href: "/courses" },
			{ label: "ใบประกาศ", href: "/account/certificates" },
		],
	},
	{
		heading: "เกี่ยวกับ",
		links: [{ label: "ผู้สอน", href: "/instructor" }],
	},
	{
		heading: "กฎหมาย",
		links: [
			{ label: "ข้อตกลงการใช้งาน", href: "/legal/terms" },
			{ label: "นโยบายความเป็นส่วนตัว", href: "/legal/privacy" },
		],
	},
];

interface PublicShellProps {
	children: React.ReactNode;
	/** When true, suppress the public footer — used by admin/full-bleed shells. */
	hideFooter?: boolean;
	/** When true, drop the global max-w container around the main slot so admin
	 * sidebar layouts can fill the viewport. */
	unboundedMain?: boolean;
}

export function PublicShell({
	children,
	hideFooter,
	unboundedMain,
}: PublicShellProps) {
	const { data: session } = useSession();
	const [drawerOpen, setDrawerOpen] = useState(false);
	const role = (session?.user as { role?: string } | undefined)?.role;
	const navItems = visibleNav(role, !!session?.user);

	return (
		<div className="flex min-h-full flex-col">
			<a
				href="#main"
				className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-(--primary) focus:px-3 focus:py-2 focus:text-(--primary-fg)"
			>
				ข้ามไปยังเนื้อหา
			</a>
			<AppHeader
				navItems={navItems}
				user={
					session?.user
						? {
								name: session.user.name,
								email: session.user.email,
								image: (session.user as { image?: string | null }).image,
								role,
							}
						: null
				}
				rightSlot={
					<a
						href="https://www.youtube.com/@armrileyquant"
						target="_blank"
						rel="noopener noreferrer"
						aria-label="YouTube"
						className="inline-flex h-8 w-8 items-center justify-center rounded-md text-(--foreground-muted) hover:bg-(--surface-muted) hover:text-(--foreground)"
					>
						<YoutubeLogo size={18} weight="fill" />
					</a>
				}
				onMobileMenuToggle={() => setDrawerOpen((o) => !o)}
				mobileMenuOpen={drawerOpen}
			/>

			{drawerOpen && (
				<div className="sticky top-16 z-40 border-t border-(--border) bg-(--surface) md:hidden">
					<nav
						className="mx-auto flex max-w-[1200px] flex-col gap-1 px-6 py-4"
						aria-label="เมนูมือถือ"
					>
						{navItems.map((n) => (
							<Link
								key={n.href}
								href={n.href}
								className="rounded-nav px-3 py-2 text-ui text-(--foreground) hover:bg-(--surface-muted)"
								onClick={() => setDrawerOpen(false)}
							>
								{n.label}
							</Link>
						))}
						<div className="my-2 h-px bg-(--border)" />
						{session?.user ? (
							<Link
								href="/account"
								className="rounded-nav px-3 py-2 text-ui text-(--foreground) hover:bg-(--surface-muted)"
								onClick={() => setDrawerOpen(false)}
							>
								บัญชีของฉัน
							</Link>
						) : (
							<>
								<Button
									asChild
									variant="ghost"
									size="md"
									className="justify-start"
								>
									<Link href="/login" onClick={() => setDrawerOpen(false)}>
										เข้าสู่ระบบ
									</Link>
								</Button>
								<Button asChild variant="primary" size="md">
									<Link href="/register" onClick={() => setDrawerOpen(false)}>
										สมัคร
									</Link>
								</Button>
							</>
						)}
						<div className="mt-2 flex justify-end">
							<ThemeToggle />
						</div>
					</nav>
				</div>
			)}

			<main id="main" className={unboundedMain ? "flex-1 min-h-0" : "flex-1"}>
				{children}
			</main>

			{hideFooter ? null : (
				<footer className="border-t border-(--border) bg-(--surface-muted) py-12">
					<div className="mx-auto max-w-[1200px] px-6">
						<div className="grid gap-8 md:grid-cols-[2fr_1fr_1fr_1fr] md:gap-12">
							<div>
								<div className="mb-3 flex items-center gap-2">
									<span
										className="h-2.5 w-2.5 rounded-full bg-(--primary)"
										aria-hidden
									/>
									<span className="text-[18px] font-semibold">Finalive</span>
								</div>
								<p className="max-w-xs text-body text-(--foreground-muted)">
									คอร์สวิเคราะห์การเงินและการลงทุน สำหรับคนทำงานสายการเงิน
								</p>
								<div className="mt-4 flex gap-2">
									<a
										href="https://www.youtube.com/@armrileyquant"
										target="_blank"
										rel="noopener noreferrer"
										aria-label="YouTube"
										className="inline-flex h-8 w-8 items-center justify-center rounded-md text-(--foreground-muted) hover:bg-(--surface) hover:text-(--foreground)"
									>
										<YoutubeLogo size={16} weight="fill" />
									</a>
								</div>
							</div>
							{FOOTER_COLS.map((c) => (
								<div key={c.heading}>
									<div className="mb-3.5 text-uism uppercase text-(--foreground-subtle)">
										{c.heading}
									</div>
									<ul className="flex flex-col gap-2.5">
										{c.links.map((l) => (
											<li key={l.label}>
												<Link
													href={l.href}
													className="text-body text-(--foreground-muted) hover:text-(--foreground)"
												>
													{l.label}
												</Link>
											</li>
										))}
									</ul>
								</div>
							))}
						</div>
						<div className="mt-10 flex flex-col justify-between gap-3 border-t border-(--border) pt-6 md:flex-row">
							<div className="text-caption text-(--foreground-subtle)">
								© {new Date().getFullYear()} Finalive · สงวนลิขสิทธิ์
							</div>
						</div>
					</div>
				</footer>
			)}
		</div>
	);
}
