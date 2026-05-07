import { z } from "zod";
import { apiRoute } from "@/lib/api-route";
import { rejectSlip, REJECT_REASONS } from "@/server/actions/admin-slip";

const body = z.object({
	reason: z.enum(REJECT_REASONS),
	note: z.string().max(500).optional(),
});

export const POST = apiRoute({
	auth: "admin",
	body,
	handler: async ({ req, body }) => {
		const slipId = new URL(req.url).pathname.split("/").slice(-2)[0]!;
		return rejectSlip({ slipId, reason: body.reason, note: body.note });
	},
});
