import "server-only";
import crypto from "node:crypto";
import { readFile } from "node:fs/promises";
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
  const secret = args.secretOverride ?? process.env.BUNNY_STREAM_TOKEN_SECRET ?? "";
  if (!secret) throw new Error("BUNNY_STREAM_TOKEN_SECRET is not configured");
  const digest = crypto
    .createHash("sha256")
    .update(`${secret}${args.videoId}${expires}`)
    .digest();
  return { token: base64UrlEncode(digest), expires };
}

export interface EmbedUrlArgs {
  videoId: string;
  expiresAt?: number;
}

export function buildEmbedUrl(args: EmbedUrlArgs): string {
  const env = getEnv();
  const libraryId = env.BUNNY_LIBRARY_ID;
  if (!libraryId) throw new Error("BUNNY_LIBRARY_ID is not configured");
  const { token, expires } = signEmbedToken(args);
  return `https://iframe.mediadelivery.net/embed/${libraryId}/${args.videoId}?token=${token}&expires=${expires}`;
}

export interface HlsSignArgs {
  videoId: string;
  expiresAt?: number;
  userIp?: string;
  secretOverride?: string;
}

export function signHlsToken(args: HlsSignArgs): BunnyEmbedToken {
  const expires = args.expiresAt ?? Math.floor(Date.now() / 1000) + 7200;
  const secret = args.secretOverride ?? process.env.BUNNY_CDN_TOKEN_SECRET ?? "";
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

// ─── Bunny Stream Upload ───

const BUNNY_API_BASE = "https://video.bunnycdn.com";

function getBunnyHeaders(): Record<string, string> {
  const env = getEnv();
  if (!env.BUNNY_API_KEY) throw new Error("BUNNY_API_KEY is not configured");
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    AccessKey: env.BUNNY_API_KEY,
  };
}

export async function createBunnyVideo(title: string): Promise<string> {
  const env = getEnv();
  const libraryId = env.BUNNY_LIBRARY_ID;
  if (!libraryId) throw new Error("BUNNY_LIBRARY_ID is not configured");

  const res = await fetch(`${BUNNY_API_BASE}/library/${libraryId}/videos`, {
    method: "POST",
    headers: getBunnyHeaders(),
    body: JSON.stringify({ title }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "unknown");
    throw new Error(`Bunny create video failed: ${res.status} ${text}`);
  }

  const data = (await res.json()) as unknown;
  if (
    typeof data !== "object" ||
    data === null ||
    !("guid" in data) ||
    typeof (data as Record<string, unknown>).guid !== "string"
  ) {
    throw new Error("Bunny create video returned unexpected response shape");
  }
  return (data as { guid: string }).guid;
}

export async function uploadBunnyVideo(videoId: string, filePath: string): Promise<void> {
  const env = getEnv();
  const libraryId = env.BUNNY_LIBRARY_ID;
  if (!libraryId) throw new Error("BUNNY_LIBRARY_ID is not configured");

  const fileBuffer = await readFile(filePath);

  const apiKey = env.BUNNY_API_KEY;
  if (!apiKey) throw new Error("BUNNY_API_KEY is not configured");

  const res = await fetch(`${BUNNY_API_BASE}/library/${libraryId}/videos/${videoId}`, {
    method: "PUT",
    headers: {
      AccessKey: apiKey,
      "Content-Type": "application/octet-stream",
    },
    body: fileBuffer,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "unknown");
    throw new Error(`Bunny upload video failed: ${res.status} ${text}`);
  }
}

export async function deleteBunnyVideo(videoId: string): Promise<void> {
  const env = getEnv();
  const libraryId = env.BUNNY_LIBRARY_ID;
  if (!libraryId) throw new Error("BUNNY_LIBRARY_ID is not configured");

  const apiKey = env.BUNNY_API_KEY;
  if (!apiKey) throw new Error("BUNNY_API_KEY is not configured");

  const res = await fetch(`${BUNNY_API_BASE}/library/${libraryId}/videos/${videoId}`, {
    method: "DELETE",
    headers: {
      AccessKey: apiKey,
    },
  });

  if (!res.ok && res.status !== 404) {
    const text = await res.text().catch(() => "unknown");
    throw new Error(`Bunny delete video failed: ${res.status} ${text}`);
  }
}
