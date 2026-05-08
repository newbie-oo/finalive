import { apiRoute } from "@/lib/api-route";
import { ApiError } from "@/lib/api-error";
import { rateLimitConfigs } from "@/lib/rate-limit";
import { getCheckoutPending } from "@/server/repos/checkout";

export const dynamic = "force-dynamic";

export const GET = apiRoute({
	auth: "required",
	rateLimit: rateLimitConfigs.api,
	handler: async ({ req, user }) => {
		const url = new URL(req.url);
		const pendingId = url.pathname.split("/").slice(-2)[0]!;
		const pending = await getCheckoutPending(pendingId, user!.id);
		if (!pending) {
			throw new ApiError("not_found", "pending enrollment not found");
		}
		return {
			status: pending.status,
			courseSlug: pending.courseSlug,
			refCode: pending.refCode,
			amount: pending.amount,
		};
	},
});
