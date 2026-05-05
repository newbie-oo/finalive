import "server-only";
import crypto from "node:crypto";
import { getEnv } from "@/lib/env";

export interface BunnyEmbedToken {
  token: string;
  expires: number;
}

export interface SignArgs {
  videoId: string;
  expiresAt?: number; // unix seconds; default = now + 7200
  secretOverride?: string; // for tests
}

function base64UrlEncode(buf: Buffer): string {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function signEmbedToken(args: SignArgs): BunnyEmbedToken {
  const expires = args.expiresAt ?? Math.floor(Date.now() / 1000) + 7200;
  const secret =
    args.secretOverride ?? process.env.BUNNY_STREAM_TOKEN_SECRET ?? "";
  if (!secret) throw new Error("BUNNY_STREAM_TOKEN_SECRET is not configured");
  const digest = crypto
    .createHash("sha256")
    .update(`${secret}${args.videoId}${expires}`)
    .digest();
  return { token: base64UrlEncode(digest), expires };
}

export interface HlsSignArgs {
  videoId: string;
  expiresAt?: number;
  userIp?: string;
  secretOverride?: string;
}

export function signHlsToken(args: HlsSignArgs): BunnyEmbedToken {
  const expires = args.expiresAt ?? Math.floor(Date.now() / 1000) + 7200;
  const secret =
    args.secretOverride ?? process.env.BUNNY_CDN_TOKEN_SECRET ?? "";
  if (!secret) throw new Error("BUNNY_CDN_TOKEN_SECRET is not configured");
  const path = `/${args.videoId}/playlist.m3u8`;
  const message = `${path}${expires}${args.userIp ?? ""}`;
  const digest = crypto.createHmac("sha256", secret).update(message).digest();
  return { token: base64UrlEncode(digest), expires };
}

export interface HlsUrlArgs {
  videoId: string;
  expiresAt?: number;
  userIp?: string;
}

export function buildHlsUrl(args: HlsUrlArgs): string {
  const env = getEnv();
  const cdn = env.BUNNY_CDN_HOSTNAME ?? "video.bunnycdn.com";
  const secret = process.env.BUNNY_CDN_TOKEN_SECRET;
  if (!secret) {
    // Dev fallback: unsigned URL when token auth not configured
    return `https://${cdn}/${args.videoId}/playlist.m3u8`;
  }
  const { token, expires } = signHlsToken(args);
  return `https://${cdn}/${args.videoId}/playlist.m3u8?token=${token}&expires=${expires}`;
}

export async function deleteBunnyVideo(videoId: string): Promise<void> {
  const env = getEnv();
  const libraryId = env.BUNNY_LIBRARY_ID;
  if (!libraryId) throw new Error("BUNNY_LIBRARY_ID is not configured");

  const apiKey = env.BUNNY_API_KEY;
  if (!apiKey) throw new Error("BUNNY_API_KEY is not configured");

  const res = await fetch(
    `https://video.bunnycdn.com/library/${libraryId}/videos/${videoId}`,
    {
      method: "DELETE",
      headers: {
        AccessKey: apiKey,
      },
    },
  );

  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => "unknown");
    throw new Error(`Bunny delete video failed: ${res.status} ${text}`);
  }
}
