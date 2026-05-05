export interface NavItem {
	href: string;
	label: string;
	visibility?: "always" | "auth" | "student" | "admin";
}

export const PUBLIC_NAV: NavItem[] = [
	{ href: "/dashboard", label: "แดชบอร์ด", visibility: "student" },
	{ href: "/courses", label: "คอร์ส" },
	{ href: "/instructor", label: "ผู้สอน" },
	{ href: "/account/enrollments", label: "คอร์สของฉัน", visibility: "student" },
	{ href: "/account/certificates", label: "ใบประกาศ", visibility: "student" },
	{ href: "/admin", label: "Admin Panel", visibility: "admin" },
];

export const STUDENT_NAV = PUBLIC_NAV.filter((n) => n.visibility !== "admin");

export const ADMIN_NAV = PUBLIC_NAV.filter((n) => n.visibility !== "student");

export function visibleNav(
	role: string | undefined,
	isAuthed: boolean,
): NavItem[] {
	return PUBLIC_NAV.filter((n) => {
		if (n.visibility === "admin") return role === "admin";
		if (n.visibility === "student") return isAuthed && role !== "admin";
		if (n.visibility === "auth") return isAuthed;
		return true;
	});
}
