import "server-only";
import { randomUUID, createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { pendingEnrollment, paymentSlip } from "@/db/schema/payment";
import { course } from "@/db/schema/course";
import { mediaAsset } from "@/db/schema/media";
import { ApiError } from "@/lib/api-error";
import { getEnv } from "@/lib/env";
import { sniffImageType } from "@/lib/file-sniff";
import { requireSession } from "../auth-session";
import { putObject } from "../services/r2";
import { withIdempotency } from "../services/idempotency";
import { enqueueEmail } from "../services/email-queue";
import { logAudit } from "../services/audit";

export interface UploadSlipInput {
  pendingId: string;
  bytes: Buffer;
  reportedAmount?: string;
}

const uploadSlipResultSchema = z.object({
  slipId: z.string().uuid(),
  pendingId: z.string().uuid(),
  status: z.literal("submitted"),
});

export type UploadSlipResult = z.infer<typeof uploadSlipResultSchema>;

const MAX_BYTES = 5 * 1024 * 1024;

export async function uploadSlip(input: UploadSlipInput): Promise<UploadSlipResult> {
  const { user } = await requireSession();

  if (input.bytes.byteLength === 0 || input.bytes.byteLength > MAX_BYTES) {
    throw new ApiError("validation_failed", "file size out of range");
  }
  // Trust magic bytes, not the browser-supplied Content-Type. The sniffed
  // result is what we store as media_asset.mime_type so admins viewing the
  // slip get a Content-Type that matches the actual payload.
  const sniffed = sniffImageType(input.bytes);
  if (sniffed === "unknown") {
    throw new ApiError("validation_failed", "file content is not a PNG/JPEG image");
  }

  const idemKey = createHash("sha256")
    .update(input.pendingId)
    .update(":")
    .update(input.bytes)
    .digest("hex");

  return withIdempotency<UploadSlipResult>({
    scope: "slip.upload",
    key: idemKey,
    schema: uploadSlipResultSchema,
    run: async () => {
      const pendingRows = await db
        .select({
          id: pendingEnrollment.id,
          userId: pendingEnrollment.userId,
          courseId: pendingEnrollment.courseId,
          amount: pendingEnrollment.amount,
          status: pendingEnrollment.status,
          expiresAt: pendingEnrollment.expiresAt,
          refCode: pendingEnrollment.refCode,
        })
        .from(pendingEnrollment)
        .where(eq(pendingEnrollment.id, input.pendingId))
        .limit(1);
      const pending = pendingRows[0];
      if (!pending) throw new ApiError("not_found", "pending not found");
      if (pending.userId !== user.id) throw new ApiError("forbidden", "not your pending");
      if (pending.status === "paid") throw new ApiError("invalid_state", "already paid");
      if (pending.status === "expired" || pending.expiresAt.getTime() < Date.now()) {
        throw new ApiError("pending_expired", "pending has expired");
      }

      const courseRows = await db
        .select({ title: course.title, slug: course.slug })
        .from(course)
        .where(eq(course.id, pending.courseId))
        .limit(1);
      const courseInfo = courseRows[0];
      if (!courseInfo) throw new ApiError("not_found", "course missing");

      // Storage key derives only from values we control — never from the
      // user-supplied filename (which can carry path traversal / RTL overrides).
      // Original filename is intentionally discarded; we don't need it.
      const ext = sniffed === "image/png" ? "png" : "jpg";
      const storageKey = `slips/${pending.userId}/${pending.id}/${randomUUID()}.${ext}`;
      await putObject({
        bucket: "private",
        key: storageKey,
        body: input.bytes,
        contentType: sniffed,
      });

      const slipId = await db.transaction(async (tx) => {
        const [media] = await tx
          .insert(mediaAsset)
          .values({
            kind: "image",
            storage: "r2_private",
            storageKey,
            mimeType: sniffed,
            sizeBytes: input.bytes.byteLength,
            createdByUserId: user.id,
          })
          .returning({ id: mediaAsset.id });
        if (!media) throw new ApiError("internal_error", "media insert failed");

        const [slip] = await tx
          .insert(paymentSlip)
          .values({
            pendingEnrollmentId: pending.id,
            imageMediaId: media.id,
            expectedAmount: pending.amount,
            reportedAmount: input.reportedAmount ?? null,
            status: "submitted",
            idempotencyKey: idemKey,
          })
          .returning({ id: paymentSlip.id });
        if (!slip) throw new ApiError("internal_error", "slip insert failed");

        await tx
          .update(pendingEnrollment)
          .set({ status: "slip_submitted", updatedAt: new Date() })
          .where(
            and(eq(pendingEnrollment.id, pending.id), eq(pendingEnrollment.userId, user.id)),
          );

        await enqueueEmail(
          {
            toEmail: user.email,
            template: "slip_received",
            paramsJson: {
              name: user.name,
              courseTitle: courseInfo.title,
              refCode: pending.refCode,
              amount: pending.amount,
            },
            userId: user.id,
          },
          tx,
        );

        await enqueueEmail(
          {
            toEmail: getEnv().ADMIN_NOTIFY_EMAIL,
            template: "admin_new_slip",
            paramsJson: {
              studentEmail: user.email,
              courseTitle: courseInfo.title,
              refCode: pending.refCode,
              amount: pending.amount,
              reviewUrl: "/admin/slips",
            },
          },
          tx,
        );

        await logAudit(
          {
            actorType: "user",
            actorUserId: user.id,
            action: "payment_slip.uploaded",
            targetType: "payment_slip",
            targetId: slip.id,
            afterJson: { pendingId: pending.id, refCode: pending.refCode },
          },
          tx,
        );

        return slip.id;
      });

      return { slipId, pendingId: pending.id, status: "submitted" };
    },
  });
}
