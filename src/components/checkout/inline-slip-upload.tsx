"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SlipDropzone } from "./slip-dropzone";

interface InlineSlipUploadProps {
  pendingId: string;
}

/**
 * Inline slip upload for the checkout page.
 * Submits to /api/slip/upload which redirects to /checkout/[pendingId]/pending
 * on success.
 */
export function InlineSlipUpload({ pendingId }: InlineSlipUploadProps) {
  const [hasFile, setHasFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="space-y-4">
      <h2 className="text-h4">แนบสลิปการโอน</h2>

      <form
        action="/api/slip/upload"
        method="post"
        encType="multipart/form-data"
        onSubmit={() => setSubmitting(true)}
        className="space-y-4"
      >
        <input type="hidden" name="pendingId" value={pendingId} />

        <SlipDropzone
          inputId="slip-file-inline"
          onFileChange={(f) => setHasFile(!!f)}
        />

        <Button
          type="submit"
          variant="accent"
          size="lg"
          disabled={!hasFile || submitting}
          className="w-full"
        >
          {submitting ? "กำลังส่ง…" : "ยืนยันการชำระเงิน"}
        </Button>
      </form>
    </div>
  );
}
