import { getEnv } from "@/lib/env";

/**
 * Build a public CDN URL for an object key.
 * SERVER-ONLY: relies on process.env which is not available in the browser.
 * For client-safe usage, pre-compute URLs in the data layer (repo / Server
 * Component) and pass the resolved string down as a prop.
 */
export function publicUrl(key: string): string {
	const env = getEnv();
	return `${env.S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/${encodeURI(key)}`;
}
