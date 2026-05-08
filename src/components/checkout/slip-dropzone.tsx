"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { File, CheckCircle } from "@phosphor-icons/react/dist/ssr";
import {
	MAX_UPLOAD_BYTES,
	SLIP_ACCEPT,
	isSlipMimeAllowed,
} from "@/lib/upload-limits";

interface SlipDropzoneProps {
	/** DOM id for the hidden file input — must be unique on the page. */
	inputId?: string;
	/** Form input name; defaults to "slip" so multipart submission works. */
	inputName?: string;
	/** Notified whenever the selected file changes (or clears to null). */
	onFileChange?: (file: File | null) => void;
}

/**
 * Drag-and-drop slip uploader. Owns its own file/preview/drag-over state and
 * notifies the parent via `onFileChange` so the parent can wire its own submit
 * button. Browser-side validation here is best-effort UX feedback —
 * `src/lib/file-sniff.ts` is authoritative on the server.
 */
export function SlipDropzone({
	inputId = "slip-file",
	inputName = "slip",
	onFileChange,
}: SlipDropzoneProps) {
	const [file, setFile] = useState<File | null>(null);
	const [preview, setPreview] = useState<string | null>(null);
	const [dragOver, setDragOver] = useState(false);

	const handleFile = useCallback(
		(f: File | null) => {
			if (!f) {
				setFile(null);
				setPreview(null);
				onFileChange?.(null);
				return;
			}
			if (!isSlipMimeAllowed(f)) {
				toast.error("รองรับเฉพาะ PNG, JPG, PDF, HEIC");
				return;
			}
			if (f.size > MAX_UPLOAD_BYTES) {
				toast.error("ไฟล์ใหญ่เกิน 5 MB");
				return;
			}
			const looksHeic =
				/\.(heic|heif)$/i.test(f.name) || /heic|heif/i.test(f.type);
			setFile(f);
			if (f.type.startsWith("image/") && !looksHeic) {
				const reader = new FileReader();
				reader.onload = (e) => setPreview(e.target?.result as string);
				reader.readAsDataURL(f);
			} else {
				setPreview(null);
			}
			onFileChange?.(f);
		},
		[onFileChange],
	);

	const onDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault();
			setDragOver(false);
			const f = e.dataTransfer.files?.[0] ?? null;
			handleFile(f);
		},
		[handleFile],
	);

	const onDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setDragOver(true);
	}, []);

	const onDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setDragOver(false);
	}, []);

	return (
		<>
			<label
				htmlFor={inputId}
				onDrop={onDrop}
				onDragOver={onDragOver}
				onDragLeave={onDragLeave}
				className={`relative flex min-h-[280px] w-full cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary ${
					dragOver
						? "border-primary bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]"
						: file
							? "border-primary bg-[color-mix(in_srgb,var(--primary)_5%,transparent)]"
							: "border-primary bg-[color-mix(in_srgb,var(--primary)_5%,transparent)] hover:bg-[color-mix(in_srgb,var(--primary)_8%,transparent)]"
				}`}
			>
				{file ? (
					<>
						<div className="flex w-full max-w-sm items-center gap-4 rounded-xl border border-border bg-background p-3.5 text-left">
							<div className="relative flex h-[72px] w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-linear-to-br from-orange-50 to-orange-200">
								{preview ? (
									<Image
										src={preview}
										alt=""
										fill
										sizes="56px"
										className="object-cover"
										unoptimized
									/>
								) : (
									<File size={24} weight="fill" className="text-orange-400" />
								)}
							</div>
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium text-foreground">
									{file.name}
								</p>
								<p className="text-uism text-muted-foreground">
									{(file.size / 1024 / 1024).toFixed(1)} MB · พร้อมส่งตรวจ
								</p>
							</div>
							<CheckCircle
								size={24}
								weight="fill"
								className="shrink-0 text-success"
							/>
						</div>
						<p className="mt-3 max-w-sm text-uism text-muted-foreground">
							ปกปิดเลขบัญชีหรือข้อมูลส่วนตัวก่อนส่งได้ตามต้องการ
							ตราบที่ยังเห็นยอดและเลขอ้างอิง
						</p>
						<span className="mt-3 text-sm font-medium text-primary hover:underline">
							เปลี่ยนไฟล์
						</span>
					</>
				) : (
					<div className="space-y-1.5">
						<p className="text-h4 text-foreground">ลากไฟล์มาวาง หรือคลิกเลือก</p>
						<p className="text-uism text-muted-foreground">
							PNG / JPG / PDF / HEIC ขนาดไม่เกิน 5 MB
						</p>
					</div>
				)}
				<input
					id={inputId}
					name={inputName}
					type="file"
					accept={SLIP_ACCEPT}
					required
					className="sr-only"
					onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
				/>
			</label>

			{file && (
				<div className="flex justify-end">
					<button
						type="button"
						onClick={(e) => {
							e.preventDefault();
							handleFile(null);
						}}
						aria-label="Remove file"
						className="text-uism text-muted-foreground transition-colors hover:text-destructive"
					>
						ลบไฟล์
					</button>
				</div>
			)}
		</>
	);
}
