import "server-only";
import { randomUUID, createHash } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db/client";
import { pendingEnrollment, paymentSlip } from "@/db/schema/payment";
import { course } from "@/db/schema/course";
import { mediaAsset } from "@/db/schema/media";
import { ApiError } from "@/lib/api-error";
import { sniffSlipFile } from "@/lib/file-sniff";
import { withIdempotency } from "@/server/services/idempotency";
import type { ObjectStorage } from "@/server/services/storage";
import type { SlipNotifier } from "@/server/services/slip-notifier";
import type { AuditLogger } from "@/server/services/audit-logger";

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

export type UploadSlipError =
  | "validation_failed"
  | "not_found"
  | "forbidden"
  | "invalid_state"
  | "pending_expired"
  | "internal_error";

const MAX_BYTES = 5 * 1024 * 1024;

const extByMime: Record<
  Exclude<ReturnType<typeof sniffSlipFile>, "unknown">,
  string
> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/heic": "heic",
  "application/pdf": "pdf",
};

export interface SlipUploadServiceDeps {
  storage: ObjectStorage;
  notifier: SlipNotifier;
  auditLogger: AuditLogger;
}

export class SlipUploadService {
  constructor(private deps: SlipUploadServiceDeps) {}

  async upload(
    input: UploadSlipInput,
    user: { id: string; email: string; name: string },
  ): Promise<UploadSlipResult> {
    // 1. File validation
    if (input.bytes.byteLength === 0 || input.bytes.byteLength > MAX_BYTES) {
      throw new ApiError("validation_failed", "file size out of range");
    }

    const sniffed = sniffSlipFile(input.bytes);
    if (sniffed === "unknown") {
      throw new ApiError(
        "validation_failed",
        "file content must be PNG, JPEG, PDF, or HEIC",
      );
    }

    // 2. Idempotency key
    const idemKey = createHash("sha256")
      .update(input.pendingId)
      .update(":")
      .update(input.bytes)
      .digest("hex");

    return withIdempotency<UploadSlipResult>({
      scope: "slip.upload",
      key: idemKey,
      schema: uploadSlipResultSchema,
      run: async () => this.runUpload(input, user, sniffed, idemKey),
    });
  }

  private async runUpload(
    input: UploadSlipInput,
    user: { id: string; email: string; name: string },
    sniffed: Exclude<ReturnType<typeof sniffSlipFile>, "unknown">,
    idemKey: string,
  ): Promise<UploadSlipResult> {
    // Load pending enrollment
    const [pending] = await db
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

    if (!pending) throw new ApiError("not_found", "pending not found");
    if (pending.userId !== user.id)
      throw new ApiError("forbidden", "not your pending");
    if (pending.status === "paid")
      throw new ApiError("invalid_state", "already paid");
    if (
      pending.status === "expired" ||
      pending.expiresAt.getTime() < Date.now()
    ) {
      throw new ApiError("pending_expired", "pending has expired");
    }

    // Load course info
    const [courseInfo] = await db
      .select({ title: course.title, slug: course.slug })
      .from(course)
      .where(eq(course.id, pending.courseId))
      .limit(1);
    if (!courseInfo) throw new ApiError("not_found", "course missing");

    // Build storage key
    const ext = extByMime[sniffed];
    const storageKey = `slips/${pending.userId}/${pending.id}/${randomUUID()}.${ext}`;

    // Reserve media_asset row
    const [media] = await db
      .insert(mediaAsset)
      .values({
        kind: sniffed === "application/pdf" ? "pdf" : "image",
        storage: "r2_private",
        storageKey,
        mimeType: sniffed,
        sizeBytes: input.bytes.byteLength,
        status: "pending_upload",
        createdByUserId: user.id,
      })
      .returning({ id: mediaAsset.id });
    if (!media) throw new ApiError("internal_error", "media insert failed");
    const mediaId = media.id;

    // Upload to R2
    await this.deps.storage.put(storageKey, input.bytes, sniffed);

    // DB transaction
    const slipId = await db.transaction(async (tx) => {
      await tx
        .update(mediaAsset)
        .set({ status: "ready" })
        .where(eq(mediaAsset.id, mediaId));

      const [slip] = await tx
        .insert(paymentSlip)
        .values({
          pendingEnrollmentId: pending.id,
          imageMediaId: mediaId,
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
          and(
            eq(pendingEnrollment.id, pending.id),
            eq(pendingEnrollment.userId, user.id),
          ),
        );

      await this.deps.notifier.notifyStudentOfSlipReceipt({
        toEmail: user.email,
        studentName: user.name,
        courseTitle: courseInfo.title,
        refCode: pending.refCode,
        amount: Number(pending.amount),
        userId: user.id,
      });

      await this.deps.notifier.notifyAdminOfNewSlip({
        adminEmail: process.env.ADMIN_NOTIFY_EMAIL ?? "admin@finalive.dev",
        studentEmail: user.email,
        courseTitle: courseInfo.title,
        refCode: pending.refCode,
        amount: Number(pending.amount),
      });

      await this.deps.auditLogger.log(
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
  }
}
