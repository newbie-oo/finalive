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

export function buildHlsUrl(videoId: string): string {
  return `https://vz-cf7a0b15-c66.b-cdn.net/${videoId}/playlist.m3u8`;
}
