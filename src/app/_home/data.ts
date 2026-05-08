/**
 * Static content for the marketing home page. The home route renders only
 * from this module and does not touch the database. Edit and rebuild to ship.
 */

export interface HomeStats {
	readonly studentCount: number;
	readonly courseCount: number;
	readonly lessonCount: number;
}

export type HomePrice = number | "free";

export interface FeaturedCourse {
	readonly id: string;
	readonly slug: string;
	readonly title: string;
	readonly summary: string;
	readonly level: "เริ่มต้น" | "กลาง" | "สูง";
	readonly lessonCount: number;
	readonly durationMinutes: number;
	readonly priceTHB: HomePrice;
	readonly bestseller?: boolean;
}

export interface Testimonial {
	readonly name: string;
	readonly role: string;
	readonly quote: string;
	readonly rating: 1 | 2 | 3 | 4 | 5;
}

export const STATS: HomeStats = Object.freeze({
	studentCount: 12500,
	courseCount: 28,
	lessonCount: 540,
});

export const FEATURED_COURSES: ReadonlyArray<FeaturedCourse> = Object.freeze([
	Object.freeze<FeaturedCourse>({
		id: "course-financial-statements",
		slug: "financial-statements-101",
		title: "อ่านงบการเงินจริง — ฉบับนักลงทุน",
		summary:
			"อ่านงบ 3 ชนิดจริงจากบริษัทไทย เข้าใจตัวเลขที่นักวิเคราะห์ใช้",
		level: "เริ่มต้น",
		lessonCount: 18,
		durationMinutes: 240,
		priceTHB: "free",
	}),
	Object.freeze<FeaturedCourse>({
		id: "course-dcf-valuation",
		slug: "dcf-valuation-pro",
		title: "DCF Valuation แบบมืออาชีพ",
		summary: "สร้างโมเดล DCF ใน Excel จากศูนย์ — พร้อมไฟล์ตัวอย่างจริง",
		level: "กลาง",
		lessonCount: 24,
		durationMinutes: 360,
		priceTHB: 1990,
		bestseller: true,
	}),
	Object.freeze<FeaturedCourse>({
		id: "course-portfolio-construction",
		slug: "portfolio-construction",
		title: "วางพอร์ตลงทุนตามเป้าหมาย",
		summary: "เลือก ETF / กองทุนตาม risk profile + rebalance ทุกไตรมาส",
		level: "กลาง",
		lessonCount: 16,
		durationMinutes: 200,
		priceTHB: 1490,
	}),
]);

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
