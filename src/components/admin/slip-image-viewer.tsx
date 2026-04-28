"use client";

import { useQuery } from "@tanstack/react-query";

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
    <a
      href={query.data.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded border border-border bg-muted/40 p-2"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- presigned R2 URL changes per fetch; not a candidate for next/image optimization */}
      <img
        src={query.data.url}
        alt="ภาพ slip"
        className="mx-auto max-h-[60vh] w-auto rounded"
      />
    </a>
  );
}
