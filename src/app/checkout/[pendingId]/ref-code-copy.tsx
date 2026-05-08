"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Copy, Check } from "@phosphor-icons/react";

interface RefCodeCopyProps {
  refCode: string;
}

export function RefCodeCopy({ refCode }: RefCodeCopyProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(refCode);
      toast.success("คัดลอกเลขอ้างอิงแล้ว");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("คัดลอกไม่สำเร็จ");
    }
  }, [refCode]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-dashed border-border bg-surface-sunken px-3 py-1.5 text-ui transition-colors hover:bg-muted"
      aria-label="Copy reference code"
    >
      <span className="mono">{refCode}</span>
      {copied ? (
        <Check size={14} className="text-success" aria-hidden />
      ) : (
        <Copy size={14} className="text-foreground-subtle" aria-hidden />
      )}
    </button>
  );
}
