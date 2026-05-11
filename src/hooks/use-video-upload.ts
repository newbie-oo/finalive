"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

export type UploadPhase =
	| "idle"
	| "creating"
	| "uploading"
	| "processing"
	| "done"
	| "error";

export interface UseVideoUploadOptions {
	courseId: string;
	lessonId: string;
	onUploadComplete?: () => void;
}

export interface UseVideoUploadResult {
	phase: UploadPhase;
	progress: number;
	error: string | null;
	bunnyVideoId: string | null;
	upload: (file: File) => Promise<void>;
	cancel: () => void;
}

interface CreateResponse {
	ok?: boolean;
	bunnyVideoId?: string;
	uploadUrl?: string;
	apiKey?: string;
	message?: string;
}

/**
 * Manages the video upload state machine:
 * idle → creating → uploading → processing → done
 *                     ↓ error (recoverable)
 */
export function useVideoUpload({
	courseId,
	lessonId,
	onUploadComplete,
}: UseVideoUploadOptions): UseVideoUploadResult {
	const [phase, setPhase] = useState<UploadPhase>("idle");
	const [progress, setProgress] = useState(0);
	const [error, setError] = useState<string | null>(null);
	const [bunnyVideoId, setBunnyVideoId] = useState<string | null>(null);

	const xhrRef = useRef<XMLHttpRequest | null>(null);
	const currentFileRef = useRef<File | null>(null);
	const currentConfigRef = useRef<{
		bunnyVideoId: string;
		uploadUrl: string;
		apiKey: string;
	} | null>(null);

	const reset = useCallback(() => {
		setPhase("idle");
		setProgress(0);
		setError(null);
		setBunnyVideoId(null);
		currentFileRef.current = null;
		currentConfigRef.current = null;
	}, []);

	const callCancel = useCallback(
		async (videoId: string) => {
			try {
				await fetch("/api/admin/lesson-video", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						action: "cancel",
						courseId,
						lessonId,
						bunnyVideoId: videoId,
					}),
				});
			} catch {
				/* best-effort cleanup */
			}
		},
		[courseId, lessonId],
	);

	const upload = useCallback(
		async (file: File) => {
			if (!file.type.startsWith("video/")) {
				toast.error("กรุณาเลือกไฟล์วิดีโอ");
				return;
			}

			reset();
			currentFileRef.current = file;
			setPhase("creating");

			// Step 1: Ask server to create Bunny video + DB records.
			let config: { bunnyVideoId: string; uploadUrl: string; apiKey: string };
			try {
				const res = await fetch("/api/admin/lesson-video", {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						action: "create",
						courseId,
						lessonId,
						fileName: file.name,
					}),
				});
				const body = (await res.json()) as CreateResponse;
				if (
					!res.ok ||
					!body.ok ||
					!body.bunnyVideoId ||
					!body.uploadUrl ||
					!body.apiKey
				) {
					throw new Error(
						body.message || `สร้างวิดีโอล้มเหลว (${res.status})`,
					);
				}
				config = {
					bunnyVideoId: body.bunnyVideoId,
					uploadUrl: body.uploadUrl,
					apiKey: body.apiKey,
				};
				currentConfigRef.current = config;
			} catch (err) {
				const msg =
					err instanceof Error ? err.message : "สร้างวิดีโอล้มเหลว";
				setPhase("error");
				setError(msg);
				toast.error(msg);
				return;
			}

			// Step 2: Upload raw bytes directly to Bunny.
			setPhase("uploading");
			setProgress(0);

			const xhr = new XMLHttpRequest();
			xhrRef.current = xhr;
			xhr.open("PUT", config.uploadUrl);
			xhr.setRequestHeader("AccessKey", config.apiKey);
			xhr.setRequestHeader("content-type", "application/octet-stream");

			xhr.upload.onprogress = (ev) => {
				if (!ev.lengthComputable) return;
				const pct = Math.round((ev.loaded / ev.total) * 100);
				setProgress(Math.min(pct, 99));
			};
			xhr.upload.onload = () => {
				setPhase("processing");
			};

			xhr.onerror = () => {
				void callCancel(config.bunnyVideoId);
				xhrRef.current = null;
				setPhase("error");
				const msg = "เครือข่ายขัดข้องระหว่างอัปโหลดไป Bunny — ลองใหม่";
				setError(msg);
				toast.error(msg);
			};

			xhr.onabort = () => {
				void callCancel(config.bunnyVideoId);
				xhrRef.current = null;
				setPhase("idle");
			};

			xhr.onload = () => {
				xhrRef.current = null;
				if (xhr.status >= 200 && xhr.status < 300) {
					setProgress(100);
					setPhase("done");
					setError(null);
					setBunnyVideoId(config.bunnyVideoId);
					toast.success(
						"อัปโหลดเสร็จแล้ว วิดีโอกำลังเข้ารหัสที่ Bunny (1–5 นาที)",
					);
					onUploadComplete?.();
					return;
				}
				// Bunny rejected the upload (e.g. CORS, auth, size mismatch).
				void callCancel(config.bunnyVideoId);
				let msg = `อัปโหลดไป Bunny ไม่สำเร็จ (${xhr.status})`;
				try {
					const body = JSON.parse(xhr.responseText) as {
						message?: string;
					};
					if (body?.message) msg = body.message;
				} catch {
					/* ignore */
				}
				setPhase("error");
				setError(msg);
				toast.error(msg);
			};

			xhr.send(file);
		},
		[courseId, lessonId, onUploadComplete, reset, callCancel],
	);

	const cancel = useCallback(() => {
		const xhr = xhrRef.current;
		const cfg = currentConfigRef.current;
		if (xhr) {
			xhr.abort();
		}
		if (cfg) {
			void callCancel(cfg.bunnyVideoId);
		}
		reset();
	}, [callCancel, reset]);

	return { phase, progress, error, bunnyVideoId, upload, cancel };
}
