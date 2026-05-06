import { cronRoute } from "@/lib/cron-route";
import { cleanupExpiredIdempotency } from "@/server/repos/idempotency";

export const POST = cronRoute({
	handler: async () => {
		const deleted = await cleanupExpiredIdempotency();
		return { ok: true, deleted };
	},
});
