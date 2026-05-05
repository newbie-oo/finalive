"use client";

import Link from "next/link";
import { useState } from "react";
import { List, X, YoutubeLogo } from "@phosphor-icons/react";
import { useSession } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserProfileDropdown } from "@/components/user-profile-dropdown";
import { Button } from "@/components/ui/button";

interface NavItem {
	href: string;
	label: string;
	// 'always' shows for everyone; 'auth' only when logged in;
	// 'student' only for non-admin authenticated users; 'admin' only for the admin role.
	visibility?: "always" | "auth" | "student" | "admin";
}

const NAV: NavItem[] = [
	{ href: "/dashboard", label: "แดชบอร์ด", visibility: "student" },
	{ href: "/courses", label: "คอร์ส" },
	{ href: "/instructor", label: "ผู้สอน" },
	{ href: "/account/enrollments", label: "คอร์สของฉัน", visibility: "student" },
	{ href: "/account/certificates", label: "ใบประกาศ", visibility: "student" },
	{ href: "/admin", label: "Admin Panel", visibility: "admin" },
];

function visibleNav(role: string | undefined, isAuthed: boolean): NavItem[] {
	return NAV.filter((n) => {
		if (n.visibility === "admin") return role === "admin";
		if (n.visibility === "student") return isAuthed && role !== "admin";
		if (n.visibility === "auth") return isAuthed;
		return true;
	});
}

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
			<header
				className="sticky top-0 z-50 h-16 border-b border-(--border) backdrop-blur-md"
				style={{
					background: "color-mix(in srgb, var(--background) 80%, transparent)",
				}}
			>
				<div className="mx-auto flex h-full max-w-[1200px] items-center justify-between gap-6 px-6">
					<Link
						href="/"
						className="flex items-center gap-2 text-(--foreground)"
					>
						<span
							className="h-2.5 w-2.5 rounded-full bg-(--primary)"
							aria-hidden
						/>
						<span className="text-[18px] font-semibold tracking-tight">
							Finalive
						</span>
					</Link>

					<nav className="hidden items-center gap-1 md:flex" aria-label="หลัก">
						{navItems.map((n) => {
							const isAdminLink = n.visibility === "admin";
							return (
								<Link
									key={n.href}
									href={n.href}
									className={
										isAdminLink
											? "rounded-nav border border-(--primary)/30 bg-(--primary)/10 px-3 py-1.5 text-ui font-semibold text-(--primary) transition-colors hover:bg-(--primary)/15"
											: "rounded-nav px-3.5 py-2 text-ui text-(--foreground-muted) transition-colors hover:bg-(--surface-muted) hover:text-(--foreground)"
									}
								>
									{n.label}
								</Link>
							);
						})}
					</nav>

					<div className="hidden items-center gap-2 md:flex">
						<a
							href="https://www.youtube.com/@armrileyquant"
							target="_blank"
							rel="noopener noreferrer"
							aria-label="YouTube"
							className="inline-flex h-8 w-8 items-center justify-center rounded-md text-(--foreground-muted) hover:bg-(--surface-muted) hover:text-(--foreground)"
						>
							<YoutubeLogo size={18} weight="fill" />
						</a>
						<ThemeToggle />
						{session?.user ? (
							<UserProfileDropdown
								name={session.user.name}
								email={session.user.email}
								image={(session.user as { image?: string | null }).image}
								links={[
									{ href: "/account", label: "บัญชี" },
									...((session.user as { role?: string }).role === "admin"
										? [{ href: "/admin", label: "แผงควบคุม" }]
										: [
												{ href: "/account/enrollments", label: "คอร์สของฉัน" },
												{ href: "/account/certificates", label: "ใบประกาศ" },
											]),
								]}
							/>
						) : (
							<>
								<Button asChild variant="ghost" size="sm">
									<Link href="/login">เข้าสู่ระบบ</Link>
								</Button>
								<Button asChild variant="primary" size="sm">
									<Link href="/register">สมัคร</Link>
								</Button>
							</>
						)}
					</div>

					<button
						type="button"
						aria-label={drawerOpen ? "ปิดเมนู" : "เปิดเมนู"}
						aria-expanded={drawerOpen}
						onClick={() => setDrawerOpen((o) => !o)}
						className="inline-flex h-10 w-10 items-center justify-center rounded-nav text-(--foreground) hover:bg-(--surface-muted) md:hidden"
					>
						{drawerOpen ? <X size={20} /> : <List size={20} />}
					</button>
				</div>

				{drawerOpen && (
					<div className="border-t border-(--border) bg-(--surface) md:hidden">
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
			</header>

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
