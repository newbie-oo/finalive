const THB = new Intl.NumberFormat("th-TH", {
	style: "currency",
	currency: "THB",
});

export function formatTHB(value: number | string): string {
	const n = typeof value === "string" ? Number(value) : value;
	return THB.format(Number.isFinite(n) ? n : 0);
}

export function formatDuration(
	seconds: number | null | undefined,
	fallback = "—",
): string {
	if ((seconds ?? 0) <= 0) return fallback;
	const safe = seconds as number;
	const minutes = Math.floor(safe / 60);
	const remaining = safe % 60;
	return `${minutes}:${remaining.toString().padStart(2, "0")}`;
}

/** Rounds up to nearest minute and appends Thai label. */
export function formatDurationMinutes(seconds: number | null): string {
	if (seconds === null || seconds <= 0) return "—";
	const minutes = Math.ceil(seconds / 60);
	return `${minutes} นาที`;
}

export interface FormattedDuration {
	/** Numeric portion only — wrap with `<span className="num">` to apply
	 * tabular numerics. */
	value: string;
	/** Localised unit ("นาที" under one hour, "ชั่วโมง" otherwise). */
	unit: "นาที" | "ชั่วโมง";
}

/**
 * Splits a duration into a numeric value + Thai unit so callers can render
 * them with separate styling (e.g. tabular num for the value, regular weight
 * for the unit). Auto-selects unit: minutes under an hour, hours with one
 * decimal otherwise. Negative inputs are clamped to zero.
 */
/** Rounds up and returns Thai duration label (e.g. "3 ชม." or "45 นาที").
 *  Returns null for zero/negative durations. */
export function formatCourseDuration(totalSeconds: number): string | null {
	if (totalSeconds <= 0) return null;
	if (totalSeconds >= 3600) return `${Math.ceil(totalSeconds / 3600)} ชม.`;
	return `${Math.ceil(totalSeconds / 60)} นาที`;
}

export function formatDurationAuto(totalSeconds: number): FormattedDuration {
	const safeSeconds = Math.max(0, totalSeconds);
	if (safeSeconds < 3600) {
		return { value: String(Math.floor(safeSeconds / 60)), unit: "นาที" };
	}
	return { value: (safeSeconds / 3600).toFixed(1), unit: "ชั่วโมง" };
}
