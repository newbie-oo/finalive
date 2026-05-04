"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LockSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import { updateCourseAction } from "@/server/actions/admin-course";
import { CoverImageUpload } from "@/components/admin/cover-image-upload";
import type { course } from "@/db/schema/course";

type Course = typeof course.$inferSelect;

interface FieldErrors {
	slug?: string;
	title?: string;
	summary?: string;
	price?: string;
	general?: string;
}

interface CourseEditFormProps {
	course: Course;
	coverUrl?: string | null;
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const PRICE_PATTERN = /^\d+(\.\d{1,2})?$/;

export function CourseEditForm({ course, coverUrl }: CourseEditFormProps) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [errors, setErrors] = useState<FieldErrors>({});

	const [slug, setSlug] = useState(course.slug);
	const [title, setTitle] = useState(course.title);
	const [summary, setSummary] = useState(course.summary);
	const [price, setPrice] = useState(course.price);
	const [isFree, setIsFree] = useState(course.isFree);
	const [status, setStatus] = useState(course.status);

	const validate = useCallback((): boolean => {
		const next: FieldErrors = {};
		if (!slug.trim()) next.slug = "Slug จำเป็นต้องกรอก";
		else if (!SLUG_PATTERN.test(slug.trim()))
			next.slug = "ใช้ตัวพิมพ์เล็ก ตัวเลข และขีดกลางเท่านั้น";

		if (!title.trim()) next.title = "ชื่อคอร์สจำเป็นต้องกรอก";
		if (!summary.trim()) next.summary = "คำอธิบายสั้นจำเป็นต้องกรอก";

		if (!isFree) {
			if (!price.trim()) next.price = "ราคาจำเป็นต้องกรอก";
			else if (!PRICE_PATTERN.test(price.trim()))
				next.price = "ราคาต้องเป็นตัวเลข (ทศนิยมไม่เกิน 2 ตำแหน่ง)";
		}

		setErrors(next);
		return Object.keys(next).length === 0;
	}, [slug, title, summary, price, isFree]);

	const handleIsFreeChange = useCallback(
		(checked: boolean) => {
			setIsFree(checked);
			if (checked) {
				setPrice("0.00");
			} else if (price === "0.00") {
				setPrice("");
			}
		},
		[price],
	);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		if (!validate()) {
			toast.error("กรุณาแก้ไขข้อผิดพลาดในฟอร์ม");
			return;
		}

		setLoading(true);
		setErrors({});

		const formData = new FormData();
		formData.append("courseId", course.id);
		formData.append("slug", slug.trim());
		formData.append("title", title.trim());
		formData.append("summary", summary.trim());
		formData.append("price", isFree ? "0.00" : price.trim());
		formData.append("isFree", isFree ? "true" : "false");
		formData.append("status", status);

		const res = await updateCourseAction(formData);

		setLoading(false);
		if (res.ok) {
			toast.success("บันทึกคอร์สสำเร็จ");
			router.refresh();
		} else {
			const msg = res.error ?? "unknown";
			if (msg === "invalid_input") {
				setErrors((prev) => ({
					...prev,
					general: "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบ slug ราคา และช่องอื่น ๆ",
				}));
			}
			toast.error(`บันทึกไม่สำเร็จ: ${msg}`);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="mt-4 space-y-4">
			<div>
				<label className="block text-sm font-medium">
					Slug <span className="text-destructive">*</span>
				</label>
				<input
					name="slug"
					value={slug}
					onChange={(e) => {
						setSlug(e.target.value);
						if (errors.slug) setErrors((p) => ({ ...p, slug: undefined }));
					}}
					required
					pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
					title="ใช้ตัวพิมพ์เล็ก ตัวเลข และขีดกลางเท่านั้น เช่น my-course-101"
					className={`mt-1 w-full rounded border px-3 py-2 text-sm font-mono ${
						errors.slug ? "border-destructive" : ""
					}`}
				/>
				{errors.slug ? (
					<p className="mt-1 text-xs text-destructive">{errors.slug}</p>
				) : (
					<p className="mt-1 text-xs text-muted-foreground">
						ใช้ตัวพิมพ์เล็ก ตัวเลข และขีดกลางเท่านั้น (เช่น my-course-101)
					</p>
				)}
			</div>

			<div>
				<label className="block text-sm font-medium">รูปปกคอร์ส</label>
				<CoverImageUpload courseId={course.id} currentCoverUrl={coverUrl} />
			</div>

			<div>
				<label className="block text-sm font-medium">
					ชื่อคอร์ส <span className="text-destructive">*</span>
				</label>
				<input
					name="title"
					value={title}
					onChange={(e) => {
						setTitle(e.target.value);
						if (errors.title) setErrors((p) => ({ ...p, title: undefined }));
					}}
					required
					className={`mt-1 w-full rounded border px-3 py-2 text-sm ${
						errors.title ? "border-destructive" : ""
					}`}
				/>
				{errors.title && (
					<p className="mt-1 text-xs text-destructive">{errors.title}</p>
				)}
			</div>

			<div>
				<label className="block text-sm font-medium">
					คำอธิบายสั้น <span className="text-destructive">*</span>
				</label>
				<textarea
					name="summary"
					value={summary}
					onChange={(e) => {
						setSummary(e.target.value);
						if (errors.summary)
							setErrors((p) => ({ ...p, summary: undefined }));
					}}
					required
					rows={3}
					className={`mt-1 w-full rounded border px-3 py-2 text-sm ${
						errors.summary ? "border-destructive" : ""
					}`}
				/>
				{errors.summary && (
					<p className="mt-1 text-xs text-destructive">{errors.summary}</p>
				)}
			</div>

			<div>
				<label className="block text-sm font-medium">
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
				</label>
				<input
					name="price"
					type="text"
					value={isFree ? "0.00" : price}
					onChange={(e) => {
						setPrice(e.target.value);
						if (errors.price) setErrors((p) => ({ ...p, price: undefined }));
					}}
					required={!isFree}
					readOnly={isFree}
					aria-disabled={isFree}
					className={`mt-1 w-full rounded border px-3 py-2 text-sm ${
						isFree ? "bg-muted text-muted-foreground cursor-not-allowed" : ""
					} ${errors.price ? "border-destructive" : ""}`}
				/>
				{errors.price ? (
					<p className="mt-1 text-xs text-destructive">{errors.price}</p>
				) : isFree ? (
					<p className="mt-1 text-xs text-muted-foreground">
						ปลดล็อกช่อง “คอร์สฟรี” ก่อนหากต้องการตั้งราคา
					</p>
				) : null}
			</div>

			<div className="flex items-center gap-2">
				<input
					name="isFree"
					type="checkbox"
					checked={isFree}
					onChange={(e) => handleIsFreeChange(e.target.checked)}
					className="h-4 w-4"
				/>
				<label className="text-sm">คอร์สฟรี</label>
			</div>

			<div>
				<label className="block text-sm font-medium">สถานะ</label>
				<select
					name="status"
					value={status}
					onChange={(e) => setStatus(e.target.value)}
					className="mt-1 w-full rounded border px-3 py-2 text-sm"
				>
					<option value="draft">ร่าง</option>
					<option value="published">เผยแพร่</option>
					<option value="archived">เก็บถาวร</option>
				</select>
			</div>

			{errors.general && (
				<p className="text-sm text-destructive">{errors.general}</p>
			)}

			<div className="flex gap-3">
				<button
					type="submit"
					disabled={loading}
					className="rounded bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
				>
					{loading ? "กำลังบันทึก..." : "บันทึก"}
				</button>
				<Link
					href="/admin/courses"
					className="rounded border px-4 py-2 text-sm"
				>
					กลับ
				</Link>
			</div>
		</form>
	);
}
