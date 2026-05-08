"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useIsFetching, useQueryClient } from "@tanstack/react-query";
import { ArrowClockwise } from "@phosphor-icons/react";

export function SlipQueueRefreshButton() {
  const qc = useQueryClient();
  const router = useRouter();
  const fetching = useIsFetching({ queryKey: ["admin-slips"] }) > 0;
  const [pending, startTransition] = useTransition();
  const busy = fetching || pending;

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        void qc.invalidateQueries({ queryKey: ["admin-slips"] });
        startTransition(() => router.refresh());
      }}
      aria-label="Refresh slip review queue"
      className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-uism text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
    >
      <ArrowClockwise
        size={14}
        className={busy ? "motion-safe:animate-spin" : ""}
      />
      รีเฟรช
    </button>
  );
}
