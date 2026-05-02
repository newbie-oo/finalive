import { getEnv } from "@/lib/env";

/**
 * Build a public CDN URL for an object key.
 * Client-safe: no S3 credentials, no server-only barriers.
 */
export function publicUrl(key: string): string {
	const env = getEnv();
	return `${env.S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/${encodeURI(key)}`;
}
