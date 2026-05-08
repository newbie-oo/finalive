"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { LockSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import { updateCourseAction } from "@/server/actions/admin-course";
import { CoverImageUpload } from "@/components/admin/cover-image-upload";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Label, FieldError, FieldHelper } from "@/components/ui/label";
import { FormAlert } from "@/components/forms/form-alert";
import { COURSE_STATUS } from "@/db/schema/course";
import type { course } from "@/db/schema/course";

type Course = typeof course.$inferSelect;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;

const courseEditSchema = z
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

type CourseEditForm = z.infer<typeof courseEditSchema>;

const STATUS_LABELS: Record<(typeof COURSE_STATUS)[number], string> = {
	draft: "ร่าง",
	published: "เผยแพร่",
	archived: "เก็บถาวร",
};

interface CourseEditFormProps {
	course: Course;
	coverUrl?: string | null;
}

export function CourseEditForm({ course, coverUrl }: CourseEditFormProps) {
	const router = useRouter();
	const [generalError, setGeneralError] = useState<string | null>(null);

	const {
		register,
		handleSubmit,
		watch,
		setValue,
		formState: { errors, isSubmitting },
	} = useForm<CourseEditForm>({
		resolver: zodResolver(courseEditSchema),
		defaultValues: {
			slug: course.slug,
			title: course.title,
			summary: course.summary,
			price: course.price,
			isFree: course.isFree,
			// DB CHECK constraint guarantees status ∈ COURSE_STATUS at runtime;
			// drizzle infers it as string.
			status: course.status as (typeof COURSE_STATUS)[number],
		},
	});

	const isFree = watch("isFree");
	const status = watch("status");

	// Mirror the legacy UX: ticking "free" forces price to "0.00", and
	// un-ticking from "0.00" clears the field so the user types a real price.
	useEffect(() => {
		if (isFree) {
			setValue("price", "0.00", { shouldValidate: false });
		}
	}, [isFree, setValue]);

	async function onSubmit(data: CourseEditForm) {
		setGeneralError(null);
		const res = await updateCourseAction({
			courseId: course.id,
			slug: data.slug.trim(),
			title: data.title.trim(),
			summary: data.summary.trim(),
			price: data.isFree ? "0.00" : data.price.trim(),
			isFree: data.isFree,
			status: data.status,
		});

		if (res.ok) {
			toast.success("บันทึกคอร์สสำเร็จ");
			router.refresh();
			return;
		}

		const msg = res.error ?? "unknown";
		if (msg === "invalid_input") {
			setGeneralError("ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบ slug ราคา และช่องอื่น ๆ");
		}
		toast.error(`บันทึกไม่สำเร็จ: ${msg}`);
	}

	function onInvalid() {
		toast.error("กรุณาแก้ไขข้อผิดพลาดในฟอร์ม");
	}

	return (
		<form
			onSubmit={handleSubmit(onSubmit, onInvalid)}
			className="mt-4 space-y-4"
		>
			<div>
				<Label htmlFor="slug" required>
					Slug
				</Label>
				<Input
					id="slug"
					invalid={!!errors.slug}
					className="font-mono"
					{...register("slug")}
				/>
				{errors.slug ? (
					<FieldError>{errors.slug.message}</FieldError>
				) : (
					<FieldHelper>
						ใช้ตัวพิมพ์เล็ก ตัวเลข และขีดกลางเท่านั้น (เช่น my-course-101)
					</FieldHelper>
				)}
			</div>

			<div>
				<Label>รูปปกคอร์ส</Label>
				<CoverImageUpload courseId={course.id} currentCoverUrl={coverUrl} />
			</div>

			<div>
				<Label htmlFor="title" required>
					ชื่อคอร์ส
				</Label>
				<Input id="title" invalid={!!errors.title} {...register("title")} />
				{errors.title && <FieldError>{errors.title.message}</FieldError>}
			</div>

			<div>
				<Label htmlFor="summary" required>
					คำอธิบายสั้น
				</Label>
				<Textarea
					id="summary"
					rows={3}
					invalid={!!errors.summary}
					{...register("summary")}
				/>
				{errors.summary && <FieldError>{errors.summary.message}</FieldError>}
			</div>

			<div>
				<Label htmlFor="price">
					<span className="inline-flex items-center gap-1.5">
						ราคา
						{isFree && (
							<LockSimple
								size={12}
								weight="fill"
								className="text-muted-foreground"
								aria-hidden="true"
							/>
						)}
					</span>
				</Label>
				<Input
					id="price"
					type="text"
					readOnly={isFree}
					aria-disabled={isFree}
					invalid={!!errors.price}
					className={
						isFree ? "bg-muted text-muted-foreground cursor-not-allowed" : ""
					}
					{...register("price")}
				/>
				{errors.price ? (
					<FieldError>{errors.price.message}</FieldError>
				) : isFree ? (
					<FieldHelper>
						ปลดล็อกช่อง “คอร์สฟรี” ก่อนหากต้องการตั้งราคา
					</FieldHelper>
				) : null}
			</div>

			<label className="flex items-center gap-2 text-sm">
				<Checkbox
					checked={isFree}
					onCheckedChange={(v) => setValue("isFree", v === true)}
				/>
				คอร์สฟรี
			</label>

			<div>
				<Label htmlFor="status">สถานะ</Label>
				<Select
					value={status}
					onValueChange={(v) =>
						setValue("status", v as (typeof COURSE_STATUS)[number])
					}
				>
					<SelectTrigger id="status" className="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{COURSE_STATUS.map((s) => (
							<SelectItem key={s} value={s}>
								{STATUS_LABELS[s]}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<FormAlert message={generalError} variant="destructive" />

			<div className="flex gap-3">
				<Button type="submit" variant="primary" size="md" disabled={isSubmitting}>
					{isSubmitting ? "กำลังบันทึก..." : "บันทึก"}
				</Button>
				<Link
					href="/admin/courses"
					className="inline-flex items-center rounded-button border border-border px-4 py-2 text-sm text-foreground hover:bg-muted"
				>
					กลับ
				</Link>
			</div>
		</form>
	);
}
