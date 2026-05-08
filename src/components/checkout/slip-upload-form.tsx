"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SlipDropzone } from "./slip-dropzone";

interface SlipUploadFormProps {
  pendingId: string;
}

/**
 * Slip upload UX:
 *  - Drop-zone is rendered by `SlipDropzone`; the `<label htmlFor>` inside
 *    natively opens the file picker on click and supports drag-and-drop.
 *  - Amount field is intentionally absent — the system already knows what
 *    the student owes, so re-typing it would be redundant. The server falls
 *    back to the pending's expected amount when the field isn't sent.
 */
export function SlipUploadForm({ pendingId }: SlipUploadFormProps) {
  const [hasFile, setHasFile] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  return (
    <form
      action="/api/slip/upload"
      method="post"
      encType="multipart/form-data"
      onSubmit={() => setSubmitting(true)}
      className="space-y-4"
    >
      <input type="hidden" name="pendingId" value={pendingId} />

      <SlipDropzone
        inputId="slip-file-form"
        onFileChange={(f) => setHasFile(!!f)}
      />

      <Button
        type="submit"
        variant="accent"
        size="lg"
        disabled={!hasFile || submitting}
        className="w-full"
      >
        {submitting ? "กำลังส่ง…" : "ส่งสลิป"}
      </Button>
    </form>
  );
}
