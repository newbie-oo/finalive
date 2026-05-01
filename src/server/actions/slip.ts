import "server-only";
import { requireSession } from "@/server/auth-session";
import { SlipUploadService } from "@/server/payments/slip-upload-service";
import { R2ObjectStorage } from "@/server/services/storage";
import { EmailSlipNotifier } from "@/server/services/slip-notifier";
import { DbAuditLogger } from "@/server/services/audit-logger";

export interface UploadSlipInput {
	pendingId: string;
	bytes: Buffer;
	reportedAmount?: string;
}

export type UploadSlipResult = {
	slipId: string;
	pendingId: string;
	status: "submitted";
};

const service = new SlipUploadService({
	storage: new R2ObjectStorage("private"),
	notifier: new EmailSlipNotifier(),
	auditLogger: new DbAuditLogger(),
});

export async function uploadSlip(
	input: UploadSlipInput,
): Promise<UploadSlipResult> {
	const { user } = await requireSession();
	return service.upload(input, {
		id: user.id,
		email: user.email,
		name: user.name,
	});
}
