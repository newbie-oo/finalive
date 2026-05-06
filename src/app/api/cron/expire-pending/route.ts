import { cronRoute } from "@/lib/cron-route";
import { PendingEnrollmentCronRepo } from "@/server/repos/pending-enrollment-cron";

export const POST = cronRoute({
	handler: async () => {
		const result = await PendingEnrollmentCronRepo.expirePendingEnrollments();
		return { ok: true, expired: result.expired };
	},
});
