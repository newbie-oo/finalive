import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	images: {
		unoptimized: process.env.NODE_ENV === "development",
		remotePatterns: [
			{
				protocol: "https",
				hostname: "*.r2.dev",
			},
			{
				protocol: "http",
				hostname: "localhost",
				port: "9000",
			},
		],
	},
	async redirects() {
		return [
			// /account/security was retired in favour of inline sections on /account.
			{
				source: "/account/security",
				destination: "/account",
				permanent: true,
			},
		];
	},
};

export default nextConfig;
