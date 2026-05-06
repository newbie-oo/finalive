import "server-only";
import {
	type AdminDashboardCounts,
	type MonthlyRevenueRaw,
	type RawActivityRow,
} from "@/server/repos/admin-dashboard";
import { formatActivityTime } from "@/lib/format-time";

const MONTH_LABELS = [
	"ม.ค.",
	"ก.พ.",
	"มี.ค.",
	"เม.ย.",
	"พ.ค.",
	"มิ.ย.",
	"ก.ค.",
	"ส.ค.",
	"ก.ย.",
	"ต.ค.",
	"พ.ย.",
	"ธ.ค.",
];

const ACTIVITY_COLORS = [
	"#4F46E5",
	"#10B981",
	"#F97316",
	"#8B5CF6",
	"#EC4899",
	"#0EA5E9",
];

export interface ActivityRow {
	time: string;
	userName: string;
	userColor: string;
	action: string;
	amount: string | null;
	status: "success" | "warning" | "primary";
	statusLabel: string;
}

export interface MonthlyRevenue {
	month: string;
	year: number;
	current: number;
	previous: number;
}

const STATUS_LABELS: Record<string, string> = {
	success: "สำเร็จ",
	warning: "รอตรวจ",
	primary: "รับใบประกาศ",
};

export function formatAdminDashboardCounts(
	counts: AdminDashboardCounts,
): AdminDashboardCounts {
	return counts; // Already numbers, no formatting needed
}

export function formatMonthlyRevenue(
	rows: MonthlyRevenueRaw[],
): MonthlyRevenue[] {
	return rows.map((r) => ({
		month: MONTH_LABELS[r.monthIndex]!,
		year: r.year,
		current: r.current,
		previous: r.previous,
	}));
}

export function formatActivityRows(rows: RawActivityRow[]): ActivityRow[] {
	return rows.map((r, i) => ({
		time: formatActivityTime(r.time),
		userName: r.userName ?? "ผู้ใช้",
		userColor: ACTIVITY_COLORS[i % ACTIVITY_COLORS.length]!,
		action: r.action,
		amount: r.amount !== null ? `฿${r.amount.toLocaleString("th-TH")}` : null,
		status: r.status as "success" | "warning" | "primary",
		statusLabel: STATUS_LABELS[r.status] ?? r.status,
	}));
}
