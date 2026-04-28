import "server-only";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getEnv } from "@/lib/env";

declare global {
  var __finalive_r2_client: S3Client | undefined;
}

function getClient(): S3Client {
  if (globalThis.__finalive_r2_client) return globalThis.__finalive_r2_client;
  const env = getEnv();
  globalThis.__finalive_r2_client = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });
  return globalThis.__finalive_r2_client;
}

export type R2Bucket = "private" | "public";

function bucketName(b: R2Bucket): string {
  const env = getEnv();
  return b === "private" ? env.S3_BUCKET_PRIVATE : env.S3_BUCKET_PUBLIC;
}

export interface PutObjectArgs {
  bucket: R2Bucket;
  key: string;
  body: Buffer | Uint8Array | string;
  contentType?: string;
}

export async function putObject(args: PutObjectArgs): Promise<void> {
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucketName(args.bucket),
      Key: args.key,
      Body: args.body,
      ContentType: args.contentType,
    }),
  );
}

export interface SignedReadUrlArgs {
  bucket: R2Bucket;
  key: string;
  expiresInSeconds?: number;
}

export async function presignReadUrl(args: SignedReadUrlArgs): Promise<string> {
  const cmd = new GetObjectCommand({ Bucket: bucketName(args.bucket), Key: args.key });
  return getSignedUrl(getClient(), cmd, { expiresIn: args.expiresInSeconds ?? 600 });
}

export function publicUrl(key: string): string {
  const env = getEnv();
  return `${env.S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/${encodeURI(key)}`;
}
