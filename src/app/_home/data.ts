/**
 * Static marketing copy for the home page. Kept separate from
 * src/app/page.tsx so the page file stays focused on the data fetch +
 * layout, and so designers can edit testimonials/badges without diff
 * noise in the route file.
 *
 * Anything that has a real production source (course catalog, stats, etc.)
 * lives in the database — never in this module.
 */

export interface Testimonial {
	readonly name: string;
	readonly role: string;
	readonly quote: string;
	readonly rating: 1 | 2 | 3 | 4 | 5;
}

export const TESTIMONIALS: ReadonlyArray<Testimonial> = Object.freeze([
	Object.freeze<Testimonial>({
		name: "พิมพ์ชนก ส.",
		role: "Equity Analyst, บล.ชั้นนำ",
		quote:
			"คอร์ส DCF เข้าใจง่ายที่สุดที่เคยเรียน ใช้ Excel template ในงานจริงได้ทันที ทีมพี่ทุกคนแนะนำ",
		rating: 5,
	}),
	Object.freeze<Testimonial>({
		name: "ธนพล ค.",
		role: "นักลงทุนรายย่อย",
		quote:
			"เริ่มจากศูนย์เลย ตอนนี้อ่านงบการเงินเองได้ พอร์ตปีนี้บวก 18% เพราะเลือกหุ้นเป็นเองครั้งแรก",
		rating: 5,
	}),
	Object.freeze<Testimonial>({
		name: "ดร.วราภรณ์ ม.",
		role: "อาจารย์มหาวิทยาลัย",
		quote:
			"ใช้คอร์สเป็นเสริมในวิชา Corporate Finance ที่สอน นักศึกษาเข้าใจ DCF ได้เร็วขึ้นมาก",
		rating: 5,
	}),
]);

export const INSTRUCTOR_BADGES: ReadonlyArray<string> = Object.freeze([
	"CFA Charterholder",
	"Independent Equity Analyst",
	"อดีต VP Investment",
]);
