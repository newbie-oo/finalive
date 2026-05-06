/**
 * Shared time formatting utilities.
 *
 * These are pure functions that operate on Date objects and return strings.
 * Repositories must NOT call these — they return raw Date objects.
 * Services and view layers call these when building view models.
 */

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

export function formatActivityTime(d: Date): string {
	const now = new Date();
	const diffMs = now.getTime() - d.getTime();
	const diffMin = Math.floor(diffMs / 60000);
	const diffHour = Math.floor(diffMs / 3600000);
	const diffDay = Math.floor(diffMs / 86400000);

	if (diffMin < 1) return "เมื่อสักครู่";
	if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
	if (diffHour < 24) return `${diffHour} ชม. ที่แล้ว`;
	if (diffDay === 1) return "เมื่อวาน";
	if (diffDay < 7) return `${diffDay} วันที่แล้ว`;
	return `${d.getDate()} ${MONTH_LABELS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

export function timeAgo(date: Date): string {
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMin = Math.floor(diffMs / 60000);
	const diffHour = Math.floor(diffMs / 3600000);
	const diffDay = Math.floor(diffMs / 86400000);

	if (diffMin < 1) return "เมื่อสักครู่";
	if (diffMin < 60) return `${diffMin} นาทีที่แล้ว`;
	if (diffHour < 24) return `${diffHour} ชม. ที่แล้ว`;
	if (diffDay === 1) return "เมื่อวาน";
	if (diffDay < 30) return `${diffDay} วันที่แล้ว`;
	const diffMonth = Math.floor(diffDay / 30);
	if (diffMonth < 12) return `${diffMonth} เดือนที่แล้ว`;
	return `${Math.floor(diffMonth / 12)} ปีที่แล้ว`;
}
