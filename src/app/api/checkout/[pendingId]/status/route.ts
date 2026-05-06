import { apiRoute } from "@/lib/api-route";
import { getCheckoutPending } from "@/server/repos/checkout";

export const dynamic = "force-dynamic";

export const GET = apiRoute({
	auth: "required",
	handler: async ({ req, user }) => {
		const url = new URL(req.url);
		const pendingId = url.pathname.split("/").pop()!;
		const pending = await getCheckoutPending(pendingId, user!.id);
		if (!pending) {
			return { error: "not_found" };
		}
		return {
			status: pending.status,
			courseSlug: pending.courseSlug,
			refCode: pending.refCode,
			amount: pending.amount,
		};
	},
});
