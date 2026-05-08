import { describe, it, expect, vi } from "vitest";
import {
	formatAdminDashboardCounts,
	formatMonthlyRevenue,
	formatActivityRows,
} from "./admin-dashboard-presenter";

vi.mock("server-only", () => ({}));

describe("formatAdminDashboardCounts", () => {
	it("passes counts through unchanged (already numbers)", () => {
		const counts = {
			activeStudents: 12,
			pendingSlips: 3,
			publishedCourses: 7,
			monthlyRevenue: 100_000,
		};
		expect(formatAdminDashboardCounts(counts)).toBe(counts);
	});
});

describe("formatMonthlyRevenue", () => {
	it("maps monthIndex to the matching Thai abbrev label", () => {
		const out = formatMonthlyRevenue([
			{ monthIndex: 0, year: 2026, current: 50_000, previous: 30_000 },
			{ monthIndex: 11, year: 2025, current: 80_000, previous: 60_000 },
		]);

		expect(out).toEqual([
			{ month: "ม.ค.", year: 2026, current: 50_000, previous: 30_000 },
			{ month: "ธ.ค.", year: 2025, current: 80_000, previous: 60_000 },
		]);
	});
});

describe("formatActivityRows", () => {
	it("formats amount as Thai-grouped baht and falls back to default name", () => {
		const out = formatActivityRows([
			{
				time: new Date(),
				userName: null,
				action: "สมัครคอร์ส วิเคราะห์งบ",
				amount: 1500,
				status: "success",
			},
		]);

		expect(out).toHaveLength(1);
		const row = out[0]!;
		expect(row.userName).toBe("ผู้ใช้");
		expect(row.amount).toBe("฿1,500");
		expect(row.statusLabel).toBe("สำเร็จ");
	});

	it("renders amount as null when the underlying amount is null", () => {
		const out = formatActivityRows([
			{
				time: new Date(),
				userName: "Alice",
				action: "รับใบประกาศ",
				amount: null,
				status: "primary",
			},
		]);

		expect(out[0]!.amount).toBeNull();
		expect(out[0]!.statusLabel).toBe("รับใบประกาศ");
		expect(out[0]!.userName).toBe("Alice");
	});

	it("cycles userColor across the palette", () => {
		const rows = Array.from({ length: 8 }, () => ({
			time: new Date(),
			userName: "u",
			action: "a",
			amount: null,
			status: "warning",
		}));
		const out = formatActivityRows(rows);

		// Palette has 6 colors — entry 0 and entry 6 must match.
		expect(out[0]!.userColor).toBe(out[6]!.userColor);
	});

	it("falls back to the raw status string when no Thai label exists", () => {
		const out = formatActivityRows([
			{
				time: new Date(),
				userName: "Alice",
				action: "x",
				amount: null,
				status: "unknown_status",
			},
		]);

		expect(out[0]!.statusLabel).toBe("unknown_status");
	});
});
