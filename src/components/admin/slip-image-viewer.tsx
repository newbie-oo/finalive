"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, MagnifyingGlassPlus } from "@phosphor-icons/react";

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

// Refetch the signed URL slightly before it expires (TTL minus 60s buffer).
const REFETCH_INTERVAL_MS = (600 - 60) * 1000;

export function SlipImageViewer({ slipId }: { slipId: string }) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const query = useQuery({
    queryKey: ["slip-image-url", slipId],
    queryFn: () => fetchImageUrl(slipId),
    staleTime: REFETCH_INTERVAL_MS,
    refetchInterval: REFETCH_INTERVAL_MS,
    refetchOnWindowFocus: false,
  });

  if (query.isLoading) {
    return (
      <div className="rounded border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
        กำลังโหลดภาพ slip…
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <div className="rounded border border-dashed border-border p-8 text-center text-sm text-destructive">
        โหลดภาพ slip ไม่สำเร็จ
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setLightboxOpen(true)}
        className="group relative block w-full cursor-zoom-in rounded border border-border bg-muted/40 p-2"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- presigned R2 URL changes per fetch; not a candidate for next/image optimization */}
        <img
          src={query.data.url}
          alt="ภาพ slip"
          className="mx-auto max-h-[50vh] w-auto rounded"
        />
        <div className="absolute inset-0 m-auto flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition-opacity group-hover:opacity-100">
          <MagnifyingGlassPlus size={20} />
        </div>
      </button>

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            onClick={() => setLightboxOpen(false)}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <X size={20} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={query.data.url}
            alt="ภาพ slip (ขยาย)"
            className="max-h-[90vh] max-w-full rounded shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
