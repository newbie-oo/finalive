import { describe, it, expect } from "vitest";
import {
	computeStreak,
	buildHeatmap,
	buildAchievements,
} from "./dashboard-view-model";

describe("computeStreak", () => {
	it("returns 0 for empty dates", () => {
		expect(computeStreak([])).toBe(0);
	});

	it("returns 0 when most recent date is before yesterday", () => {
		const threeDaysAgo = new Date();
		threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
		expect(computeStreak([threeDaysAgo.toISOString().slice(0, 10)])).toBe(0);
	});

	it("returns 1 for today only", () => {
		const today = new Date().toISOString().slice(0, 10);
		expect(computeStreak([today])).toBe(1);
	});

	it("counts consecutive days including today", () => {
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);
		const twoDaysAgo = new Date(today);
		twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

		expect(
			computeStreak([
				today.toISOString().slice(0, 10),
				yesterday.toISOString().slice(0, 10),
				twoDaysAgo.toISOString().slice(0, 10),
			]),
		).toBe(3);
	});

	it("stops at first gap", () => {
		const today = new Date();
		const yesterday = new Date(today);
		yesterday.setDate(yesterday.getDate() - 1);
		const threeDaysAgo = new Date(today);
		threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

		expect(
			computeStreak([
				today.toISOString().slice(0, 10),
				yesterday.toISOString().slice(0, 10),
				threeDaysAgo.toISOString().slice(0, 10),
			]),
		).toBe(2);
	});
});

describe("buildHeatmap", () => {
	it("returns all zeros for empty map", () => {
		const start = new Date("2024-01-01");
		const result = buildHeatmap(7, start, new Map());
		expect(result).toEqual([0, 0, 0, 0, 0, 0, 0]);
	});

	it("buckets lesson counts correctly", () => {
		const start = new Date("2024-01-01");
		const map = new Map([
			["2024-01-01", 0],
			["2024-01-02", 1],
			["2024-01-03", 3],
			["2024-01-04", 5],
			["2024-01-05", 6],
		]);
		const result = buildHeatmap(5, start, map);
		expect(result).toEqual([0, 1, 2, 3, 4]);
	});
});

describe("buildAchievements", () => {
	it("returns 3 base achievements when quizPassCount is 0", () => {
		const result = buildAchievements(2, 5, 10, 0);
		expect(result).toHaveLength(3);
		expect(result.map((a) => a.icon)).toEqual([
			"certificate",
			"flame",
			"books",
		]);
	});

	it("includes quiz master when quizPassCount > 0", () => {
		const result = buildAchievements(1, 1, 5, 3);
		expect(result).toHaveLength(4);
		expect(result[3]!.icon).toBe("check-circle");
		expect(result[3]!.title).toBe("Quiz Master");
	});

	it("formats cert count in description", () => {
		const result = buildAchievements(5, 3, 20, 0);
		expect(result[0]!.desc).toBe("5 ใบประกาศแล้ว");
	});
});
