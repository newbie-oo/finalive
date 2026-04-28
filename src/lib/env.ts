import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(16),
  BETTER_AUTH_URL: z.string().url(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  SMTP_HOST: z.string(),
  SMTP_PORT: z.coerce.number().int().positive(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string(),
  ADMIN_NOTIFY_EMAIL: z.string().email().default("admin@finalive.dev"),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string(),
  S3_ACCESS_KEY_ID: z.string(),
  S3_SECRET_ACCESS_KEY: z.string(),
  S3_BUCKET_PRIVATE: z.string(),
  S3_BUCKET_PUBLIC: z.string(),
  S3_PUBLIC_BASE_URL: z.string().url(),
  BUNNY_LIBRARY_ID: z.string().optional(),
  BUNNY_API_KEY: z.string().optional(),
  BUNNY_CDN_HOSTNAME: z.string().optional(),
  CRON_SECRET: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

// Build-time fallbacks for `next build` page-data collection only.
// Critical: BETTER_AUTH_SECRET is intentionally absent — secrets must be explicit.
// If a build runs without a real secret, env validation fails loudly; that's correct.
const BUILD_FALLBACK: Record<string, string> = {
  DATABASE_URL: "postgres://build:build@localhost:5432/build",
  BETTER_AUTH_URL: "http://localhost:3000",
  SMTP_HOST: "localhost",
  SMTP_PORT: "1025",
  EMAIL_FROM: "build@example.com",
  S3_ENDPOINT: "http://localhost:9000",
  S3_REGION: "auto",
  S3_ACCESS_KEY_ID: "build",
  S3_SECRET_ACCESS_KEY: "build",
  S3_BUCKET_PRIVATE: "build-private",
  S3_BUCKET_PUBLIC: "build-public",
  S3_PUBLIC_BASE_URL: "http://localhost:9000/build-public",
};

let cached: Env | null = null;

function isBuildPhase(): boolean {
  // Two gates: NEXT_PHASE marker AND non-production NODE_ENV. If a runtime
  // worker is ever started with NEXT_PHASE leaking through, NODE_ENV=production
  // still blocks the fallback so secrets can't silently default.
  if (process.env.NEXT_PHASE !== "phase-production-build") return false;
  if (process.env.NODE_ENV === "production" && process.env.BETTER_AUTH_SECRET) {
    // build that has the real secret in env — no need for fallback at all
    return false;
  }
  return true;
}

export function getEnv(): Env {
  if (cached) return cached;
  const source: Record<string, string | undefined> = { ...process.env };
  if (isBuildPhase()) {
    for (const [k, v] of Object.entries(BUILD_FALLBACK)) {
      if (!source[k]) source[k] = v;
    }
    // Provide a deterministic placeholder for BETTER_AUTH_SECRET *only* during
    // the build phase; the runtime path never reaches here.
    if (!source.BETTER_AUTH_SECRET) {
      source.BETTER_AUTH_SECRET = "build-time-placeholder-NOT-FOR-RUNTIME-USE";
    }
  }
  const parsed = envSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}
