import { apiRouteRaw } from "@/lib/api-route";
import { getEnv } from "@/lib/env";

export const GET = apiRouteRaw({
	handler: async () => {
		const env = getEnv();
		const googleConfigured = !!(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
		return { google: googleConfigured };
	},
});
