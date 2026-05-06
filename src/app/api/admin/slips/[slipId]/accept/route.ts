import { apiRoute } from "@/lib/api-route";
import { acceptSlip } from "@/server/actions/admin-slip";

export const POST = apiRoute({
	auth: "admin",
	handler: async ({ req }) => {
		const slipId = new URL(req.url).pathname.split("/").pop()!;
		return acceptSlip(slipId);
	},
});
