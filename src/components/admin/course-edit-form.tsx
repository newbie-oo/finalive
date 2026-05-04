"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LockSimple } from "@phosphor-icons/react";
import { toast } from "sonner";
import { updateCourseAction } from "@/server/actions/admin-course";
import { CoverImageUpload } from "@/components/admin/cover-image-upload";
import type { course } from "@/db/schema/course";

type Course = typeof course.$inferSelect;

interface CourseEditFormProps {
	course: Course;
	coverUrl?: string | null;
}

export function CourseEditForm({ course, coverUrl }: CourseEditFormProps) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);

	// All fields controlled so the form stays in sync after router.refresh()
	const [slug, setSlug] = useState(course.slug);
	const [title, setTitle] = useState(course.title);
	const [summary, setSummary] = useState(course.summary);
	const [price, setPrice] = useState(course.price);
	const [isFree, setIsFree] = useState(course.isFree);
	const [status, setStatus] = useState(course.status);

	const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		setLoading(true);

		// Build FormData manually so every field is explicit (no hidden-input
		// ambiguity with the isFree checkbox).
		const formData = new FormData();
		formData.append("courseId", course.id);
		formData.append("slug", slug);
		formData.append("title", title);
		formData.append("summary", summary);
		formData.append("price", isFree ? "0.00" : price);
		formData.append("isFree", isFree ? "true" : "false");
		formData.append("status", status);

		const res = await updateCourseAction(formData);

		setLoading(false);
		if (res.ok) {
			toast.success("บันทึกคอร์สสำเร็จ");
			router.refresh();
		} else {
			toast.error(`บันทึกไม่สำเร็จ: ${res.error ?? "unknown"}`);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="mt-4 space-y-4">
			<div>
				<label className="block text-sm font-medium">Slug</label>
				<input
					name="slug"
					value={slug}
					onChange={(e) => setSlug(e.target.value)}
					required
					className="mt-1 w-full rounded border px-3 py-2 text-sm font-mono"
				/>
				<p className="mt-1 text-xs text-muted-foreground">
					ใช้ตัวพิมพ์เล็ก ตัวเลข และขีดกลางเท่านั้น
				</p>
			</div>

			<div>
				<label className="block text-sm font-medium">รูปปกคอร์ส</label>
				<CoverImageUpload courseId={course.id} currentCoverUrl={coverUrl} />
			</div>

			<div>
				<label className="block text-sm font-medium">ชื่อคอร์ส</label>
				<input
					name="title"
					value={title}
					onChange={(e) => setTitle(e.target.value)}
					required
					className="mt-1 w-full rounded border px-3 py-2 text-sm"
				/>
			</div>

			<div>
				<label className="block text-sm font-medium">คำอธิบายสั้น</label>
				<textarea
					name="summary"
					value={summary}
					onChange={(e) => setSummary(e.target.value)}
					required
					rows={3}
					className="mt-1 w-full rounded border px-3 py-2 text-sm"
				/>
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
					onChange={(e) => setPrice(e.target.value)}
					required={!isFree}
					readOnly={isFree}
					aria-disabled={isFree}
					className={
						"mt-1 w-full rounded border px-3 py-2 text-sm" +
						(isFree ? " bg-muted text-muted-foreground cursor-not-allowed" : "")
					}
				/>
				{isFree && (
					<p className="mt-1 text-xs text-muted-foreground">
						ปลดล็อกช่อง “คอร์สฟรี” ก่อนหากต้องการตั้งราคา
					</p>
				)}
			</div>

			<div className="flex items-center gap-2">
				<input
					name="isFree"
					type="checkbox"
					checked={isFree}
					onChange={(e) => setIsFree(e.target.checked)}
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
