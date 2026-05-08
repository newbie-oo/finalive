import { z } from "zod";
import { apiRoute } from "@/lib/api-route";
import { rateLimitConfigs } from "@/lib/rate-limit";
import { bulkRejectSlips, REJECT_REASONS } from "@/server/actions/admin-slip";

const body = z.object({
	slipIds: z.array(z.string().uuid()).min(1).max(50),
	reason: z.enum(REJECT_REASONS),
	note: z.string().max(500).optional(),
});

export const POST = apiRoute({
	auth: "admin",
	rateLimit: rateLimitConfigs.checkout,
	body,
	handler: async ({ body }) => {
		return bulkRejectSlips(body.slipIds, body.reason, body.note);
	},
});
