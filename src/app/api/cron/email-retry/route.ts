import { cronRoute } from "@/lib/cron-route";
import { EmailCronRepo } from "@/server/repos/email-cron";

export const POST = cronRoute({
	handler: async () => {
		const result = await EmailCronRepo.retryFailedEmails();
		return { ok: true, retried: result.retried, succeeded: result.succeeded };
	},
});
