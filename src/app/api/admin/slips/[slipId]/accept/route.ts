import { apiRoute } from "@/lib/api-route";
import { rateLimitConfigs } from "@/lib/rate-limit";
import { acceptSlip } from "@/server/actions/admin-slip";

export const POST = apiRoute({
	auth: "admin",
	rateLimit: rateLimitConfigs.api,
	handler: async ({ req }) => {
		const slipId = new URL(req.url).pathname.split("/").slice(-2)[0]!;
		return acceptSlip(slipId);
	},
});
