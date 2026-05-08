import { z } from "zod";
import { COURSE_STATUS } from "@/db/schema/course";

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;

/**
 * Zod schema for the admin course-edit form. Lives in its own file so the
 * conditional `price` rule (required + numeric format only when !isFree)
 * can be unit-tested without mounting the full RHF form.
 */
export const courseEditSchema = z
	.object({
		slug: z
			.string()
			.trim()
			.min(1, "Slug จำเป็นต้องกรอก")
			.regex(SLUG_PATTERN, "ใช้ตัวพิมพ์เล็ก ตัวเลข และขีดกลางเท่านั้น"),
		title: z.string().trim().min(1, "ชื่อคอร์สจำเป็นต้องกรอก"),
		summary: z.string().trim().min(1, "คำอธิบายสั้นจำเป็นต้องกรอก"),
		price: z.string(),
		isFree: z.boolean(),
		status: z.enum(COURSE_STATUS),
	})
	.superRefine((data, ctx) => {
		if (data.isFree) return;
		const v = data.price.trim();
		if (!v) {
			ctx.addIssue({
				code: "custom",
				path: ["price"],
				message: "ราคาจำเป็นต้องกรอก",
			});
		} else if (!PRICE_PATTERN.test(v)) {
			ctx.addIssue({
				code: "custom",
				path: ["price"],
				message: "ราคาต้องเป็นตัวเลข (ทศนิยมไม่เกิน 2 ตำแหน่ง)",
			});
		}
	});

export type CourseEditForm = z.infer<typeof courseEditSchema>;
