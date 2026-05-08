"use client";

import Image from "next/image";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
	X,
	MagnifyingGlassPlus,
	MagnifyingGlassMinus,
	ArrowsClockwise,
	ArrowsOutSimple,
} from "@phosphor-icons/react/dist/ssr";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ui/button";

interface ImageUrlResponse {
	url: string;
	mimeType: string | null;
	expiresInSeconds: number;
}

async function fetchImageUrl(slipId: string): Promise<ImageUrlResponse> {
	const res = await fetch(`/api/admin/slips/${slipId}/image-url`, {
		headers: { accept: "application/json" },
	});
	if (!res.ok) throw new Error(`HTTP ${res.status}`);
	return (await res.json()) as ImageUrlResponse;
}

const REFETCH_INTERVAL_MS = (600 - 60) * 1000;

const ZOOM_LEVELS = [1, 1.5, 2, 3] as const;

/**
 * Slip image preview + full-screen lightbox. The lightbox supports
 * rotation (90° increments), discrete zoom levels, and native pinch-zoom
 * on touch devices via `touch-action: pinch-zoom`. Toolbar controls live
 * outside the image so the focal point stays centred while scaling.
 */
export function SlipImageViewer({ slipId }: { slipId: string }) {
	const [lightboxOpen, setLightboxOpen] = useState(false);
	const [rotation, setRotation] = useState(0);
	const [zoomIdx, setZoomIdx] = useState(0);
	const query = useQuery({
		queryKey: queryKeys.slipImageUrl(slipId),
		queryFn: () => fetchImageUrl(slipId),
		staleTime: REFETCH_INTERVAL_MS,
		refetchInterval: REFETCH_INTERVAL_MS,
		refetchOnWindowFocus: false,
	});

	if (query.isLoading) {
		return (
			<div className="rounded-sm border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
				กำลังโหลดภาพ slip…
			</div>
		);
	}

	if (query.isError || !query.data) {
		return (
			<div className="rounded-sm border border-dashed border-border p-8 text-center text-sm text-destructive">
				โหลดภาพ slip ไม่สำเร็จ
			</div>
		);
	}

	function openLightbox() {
		setRotation(0);
		setZoomIdx(0);
		setLightboxOpen(true);
	}

	const zoom = ZOOM_LEVELS[zoomIdx] ?? 1;

	return (
		<>
			<button
				type="button"
				onClick={openLightbox}
				className="group relative block w-full cursor-zoom-in rounded-sm border border-border bg-muted/40 p-2"
			>
				<Image
					src={query.data.url}
					alt="ภาพ slip"
					width={800}
					height={1200}
					className="mx-auto h-auto max-h-[50vh] w-auto rounded-sm"
					unoptimized
				/>
				<div className="absolute inset-0 m-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100">
					<MagnifyingGlassPlus size={20} />
				</div>
				<span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-pill bg-black/60 px-2 py-0.5 text-uism font-medium text-white">
					<ArrowsOutSimple size={12} weight="bold" /> เต็มจอ
				</span>
			</button>

			{lightboxOpen && (
				<div
					className="fixed inset-0 z-100 flex flex-col bg-black/95"
					onClick={() => setLightboxOpen(false)}
				>
					<div
						className="flex items-center justify-between gap-2 px-4 py-3"
						onClick={(e) => e.stopPropagation()}
					>
						<span className="text-uism text-white/80">
							ขยาย ×{zoom.toFixed(1)} · หมุน {rotation}°
						</span>
						<div className="flex items-center gap-1">
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								className="text-white hover:bg-white/10"
								aria-label="ลดขนาด"
								disabled={zoomIdx === 0}
								onClick={() => setZoomIdx((i) => Math.max(0, i - 1))}
							>
								<MagnifyingGlassMinus size={16} weight="bold" />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								className="text-white hover:bg-white/10"
								aria-label="ขยายขนาด"
								disabled={zoomIdx === ZOOM_LEVELS.length - 1}
								onClick={() =>
									setZoomIdx((i) =>
										Math.min(ZOOM_LEVELS.length - 1, i + 1),
									)
								}
							>
								<MagnifyingGlassPlus size={16} weight="bold" />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								className="text-white hover:bg-white/10"
								aria-label="หมุน 90 องศา"
								onClick={() => setRotation((r) => (r + 90) % 360)}
							>
								<ArrowsClockwise size={16} weight="bold" />
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="icon-sm"
								className="text-white hover:bg-white/10"
								aria-label="ปิด"
								onClick={() => setLightboxOpen(false)}
							>
								<X size={16} weight="bold" />
							</Button>
						</div>
					</div>
					<div
						className="flex flex-1 items-center justify-center overflow-auto p-4"
						style={{ touchAction: "pinch-zoom" }}
					>
						<Image
							src={query.data.url}
							alt="ภาพ slip (ขยาย)"
							width={1600}
							height={2400}
							className="h-auto max-h-full w-auto max-w-full rounded-sm shadow-2xl transition-transform duration-150"
							style={{
								transform: `rotate(${rotation}deg) scale(${zoom})`,
								transformOrigin: "center",
							}}
							onClick={(e) => e.stopPropagation()}
							unoptimized
						/>
					</div>
				</div>
			)}
		</>
	);
}
