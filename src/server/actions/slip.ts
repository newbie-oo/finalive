import "server-only";
import { requireSession } from "@/server/auth-session";
import { container } from "@/server/container";

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

export async function uploadSlip(
	input: UploadSlipInput,
): Promise<UploadSlipResult> {
	const { user } = await requireSession();
	const service = container.slipUpload();
	return service.upload(input, {
		id: user.id,
		email: user.email,
		name: user.name,
	});
}
