import { z } from "zod";
import { apiRoute } from "@/lib/api-route";
import { rateLimitConfigs } from "@/lib/rate-limit";
import { bulkAcceptSlips } from "@/server/actions/admin-slip";

const body = z.object({
	slipIds: z.array(z.string().uuid()).min(1).max(50),
});

export const POST = apiRoute({
	auth: "admin",
	rateLimit: rateLimitConfigs.checkout,
	body,
	handler: async ({ body }) => {
		return bulkAcceptSlips(body.slipIds);
	},
});
