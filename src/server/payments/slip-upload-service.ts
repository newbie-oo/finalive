import "server-only";
import { randomUUID, createHash } from "node:crypto";
import { z } from "zod";
import { ApiError } from "@/lib/api-error";
import { sniffSlipFile } from "@/lib/file-sniff";
import { MAX_UPLOAD_BYTES } from "@/lib/upload-limits";
import { withIdempotency } from "@/server/repos/idempotency";
import type { ObjectStorage } from "@/server/services/storage";
import type { SlipNotifier } from "@/server/services/slip-notifier";
import type { AuditLogger } from "@/server/services/audit";
import type * as SlipRepo from "@/server/repos/slip";

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

const MAX_BYTES = MAX_UPLOAD_BYTES;

const extByMime: Record<
	Exclude<ReturnType<typeof sniffSlipFile>, "unknown">,
	string
> = {
	"image/png": "png",
	"image/jpeg": "jpg",
	"image/heic": "heic",
	"application/pdf": "pdf",
};

/** Narrow interface: only the SlipRepo methods the upload service needs. */
export interface SlipUploadRepo {
	countSlipsForPending: typeof SlipRepo.countSlipsForPending;
	loadPending: typeof SlipRepo.loadPending;
	loadCourseInfo: typeof SlipRepo.loadCourseInfo;
	reserveMediaAsset: typeof SlipRepo.reserveMediaAsset;
	finalizeUploadTx: typeof SlipRepo.finalizeUploadTx;
}

export interface SlipUploadServiceDeps {
	repo: SlipUploadRepo;
	storage: ObjectStorage;
	notifier: SlipNotifier;
	auditLogger: AuditLogger;
	/** Resolves the admin notification email at call time so tests can stub
	 * it without standing up the full env validator. */
	adminNotifyEmail: () => string;
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

		// 2. Idempotency key — scoped to the current submission attempt so
		// re-uploads after admin rejection are NOT collapsed into the prior
		// slip. We include the count of existing slips for this pending as
		// a per-attempt salt: 0 on first try, N after N rejections.
		const attempt = await this.deps.repo.countSlipsForPending(input.pendingId);
		const idemKey = createHash("sha256")
			.update(input.pendingId)
			.update(":")
			.update(String(attempt))
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
		const pending = await this.deps.repo.loadPending(input.pendingId);
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
		const courseInfo = await this.deps.repo.loadCourseInfo(pending.courseId);
		if (!courseInfo) throw new ApiError("not_found", "course missing");

		// Build storage key
		const ext = extByMime[sniffed];
		const storageKey = `slips/${pending.userId}/${pending.id}/${randomUUID()}.${ext}`;

		// Reserve media_asset row
		const mediaId = await this.deps.repo.reserveMediaAsset({
			kind: sniffed === "application/pdf" ? "pdf" : "image",
			storageKey,
			mimeType: sniffed,
			sizeBytes: input.bytes.byteLength,
			userId: user.id,
		});

		// Upload to R2
		await this.deps.storage.put(storageKey, input.bytes, sniffed);

		// DB transaction
		const slipId = await this.deps.repo.finalizeUploadTx({
			mediaId,
			pendingId: pending.id,
			userId: user.id,
			idempotencyKey: idemKey,
			expectedAmount: pending.amount,
			reportedAmount: input.reportedAmount ?? null,
		});

		// Notifications (outside tx — fire-and-forget)
		await this.deps.notifier.notifyStudentOfSlipReceipt({
			toEmail: user.email,
			studentName: user.name,
			courseTitle: courseInfo.title,
			refCode: pending.refCode,
			amount: Number(pending.amount),
			userId: user.id,
		});

		await this.deps.notifier.notifyAdminOfNewSlip({
			adminEmail: this.deps.adminNotifyEmail(),
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
				targetId: slipId,
				afterJson: { pendingId: pending.id, refCode: pending.refCode },
			},
			undefined,
		);

		return { slipId, pendingId: pending.id, status: "submitted" };
	}
}
