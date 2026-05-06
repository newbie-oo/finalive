import { apiRouteRaw } from "@/lib/api-route";

export const GET = apiRouteRaw({
	handler: async () => {
		const googleConfigured = !!(
			process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
		);
		return { google: googleConfigured };
	},
});
