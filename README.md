# Finalive

Online finance learning platform — courses, lessons, quizzes, completion certificates, and Thai-bank-slip checkout — built on Next.js 16 (App Router), Drizzle, Better Auth, and TanStack Query.

> **Heads up — this is not the Next.js you're used to.** APIs, conventions, and file structure may differ from prior versions. When in doubt, read the relevant guide under `node_modules/next/dist/docs/` before writing code.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16.2 App Router · React 19.2 · TypeScript 5 |
| Auth | Better Auth 1.6 (email + Google OAuth) |
| Database | Postgres 16 · Drizzle ORM 0.36 |
| Object storage | Cloudflare R2 (prod) / MinIO (dev) — S3-compatible |
| Video | Bunny Stream (HLS + signed-token playback) |
| Email | Nodemailer + Mailpit (dev) / SMTP relay (prod) |
| PDF | `@react-pdf/renderer` for completion certificates |
| Forms | React Hook Form 7.75 + `@hookform/resolvers/zod` |
| Server state | TanStack Query 5 with the central key factory at `src/lib/query-keys.ts` |
| Styling | Tailwind v4 with semantic tokens + shadcn primitives |
| Tests | Vitest 2 (unit + jsdom integration) · Playwright (E2E) |
| Hosting | Vercel (Edge Firewall + serverless functions) |

---

## Local development

### Prereqs

- Node ≥ 20.18
- pnpm ≥ 9
- Docker Desktop (for Postgres + MinIO + Mailpit)

### One-shot bootstrap

```bash
pnpm install
cp .env.example .env
pnpm stack:up        # spins up Postgres, MinIO, Mailpit
pnpm db:migrate      # apply Drizzle migrations
pnpm seed            # optional: seed demo courses + admin user
pnpm dev             # http://localhost:3000
```

Mailpit UI: http://localhost:8025 — every dev email lands here.
MinIO console: http://localhost:9001 (`minio` / `miniodev`).

### Useful scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Next.js dev server with HMR |
| `pnpm build` | Production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint with `--max-warnings=0` |
| `pnpm test` | Vitest unit tests (`vitest run`) |
| `pnpm test:watch` | Watch mode |
| `pnpm test:integration` | Vitest integration suite (needs Postgres) |
| `pnpm e2e` / `pnpm e2e:ui` | Playwright E2E |
| `pnpm check` | typecheck + lint + test (CI gate) |
| `pnpm db:generate` | Generate Drizzle migration from schema diff |
| `pnpm db:migrate` | Apply pending migrations |
| `pnpm db:studio` | Open Drizzle Studio |
| `pnpm db:reset` | Drop and recreate the dev database |
| `pnpm stack:up` / `stack:down` | Bring the dev container stack up/down |

---

## Project layout

```
src/
├── app/                       # App Router routes (RSC by default)
│   ├── (public)/              # Marketing + course catalog
│   ├── (student)/             # Authed dashboard, account, certificates
│   ├── admin/                 # Admin panel (course CRUD, slip queue)
│   ├── api/                   # Route handlers
│   ├── checkout/              # Pending → slip-upload → review flow
│   └── learn/                 # Course player (curriculum + video + notes)
├── components/                # Reusable client components (shadcn + custom)
├── db/
│   ├── client.ts              # Drizzle client
│   ├── predicates.ts          # Soft-delete helpers (notDeleted)
│   └── schema/                # Tables (course, enrollment, payment, audit, …)
├── lib/                       # Pure helpers (zero DB / IO)
│   ├── api-route.ts           # apiRoute / apiRouteRaw declarative wrappers
│   ├── api-error.ts           # ApiError envelope + status mapping
│   ├── env.ts                 # Validated env (Zod)
│   ├── logger.ts              # Structured JSON logger (process.stdout/stderr)
│   ├── query-keys.ts          # Central TanStack Query key factory
│   ├── rate-limit.ts          # In-memory token bucket (defense-in-depth)
│   └── upload-limits.ts       # MAX_UPLOAD_BYTES, SLIP_ACCEPT, isSlipMimeAllowed
└── server/
    ├── actions/               # `"use server"` mutations (thin shells over services)
    ├── adapters/              # Drizzle ↔ pure-domain adapters
    ├── auth-session.ts        # Better Auth wrapper, React `cache()`-memoised
    ├── certificates/          # Cert PDF render + DB persistence
    ├── container.ts           # Composition root for services
    ├── email/                 # React Email templates + dispatch
    ├── payments/              # Slip upload, slip review, pending FSM
    ├── repos/                 # Drizzle repositories (no business logic)
    └── services/              # Pure domain services (DI, no globals)
```

ADRs that explain the architecture seams live in `docs/adr/`. Read these before
adding a new service or repository.

---

## Architecture cheatsheet

### API routes use the `apiRoute` wrapper

```ts
import { z } from "zod";
import { apiRoute } from "@/lib/api-route";

const body = z.object({ slipIds: z.array(z.string().uuid()).min(1).max(50) });

export const POST = apiRoute({
  auth: "admin",
  rateLimit: rateLimitConfigs.checkout,   // optional
  body,
  handler: async ({ body, user }) => bulkAcceptSlips(body.slipIds),
});
```

Auth, validation, rate-limit, and the JSON error envelope are uniform across
every route. Handlers stay focused on calling a service.

### Services receive their dependencies

```ts
new SlipUploadService({
  repo: SlipRepo,
  storage: new R2ObjectStorage("private"),
  notifier: makeEmailSlipNotifier(),
  auditLogger: makeDbAuditLogger(),
  adminNotifyEmail: () => getEnv().ADMIN_NOTIFY_EMAIL,
});
```

The composition lives in `src/server/container.ts`. Services are tested with
plain object fakes — no DB required for unit tests.

### Errors use the `ApiError` envelope

```ts
throw new ApiError("validation_failed", "file size out of range");
// → 400 { code, message, request_id }
```

Postgres `code` (SQLSTATE) is classified by `src/lib/pg-error.ts` so unique /
FK / check violations map to predictable HTTP responses.

### Soft deletes go through `notDeleted(table)`

```ts
.where(and(eq(course.id, id), notDeleted(course)))
```

54 inline `isNull(table.deletedAt)` calls were consolidated; use the helper for
new queries so a forgotten predicate doesn't silently leak deleted rows.

---

## Rate limiting

Two layers, with Vercel handling burst defense at the edge so functions don't
even cold-start during an attack.

### Layer 1 — Vercel Firewall (primary)

Configured in the Vercel dashboard. Rule:

```
If: path matches /api/auth/* OR /api/upload/*
Then: 60 requests / 1 min per IP, action = Challenge
```

This is the production guardrail for the high-risk surfaces (auth and
file uploads). The challenge action means abusive IPs get a CAPTCHA-style
interstitial before the request hits a function — no Node code runs.

### Layer 2 — App-level token bucket (defense-in-depth)

`src/lib/rate-limit.ts` provides an in-memory token bucket that the
`apiRoute` wrapper consults. It is **stricter** than the Vercel rule and
covers paths the firewall doesn't:

| Config | Limit | Used by |
| --- | --- | --- |
| `auth` | 5 / min | (reserved for future auth endpoints) |
| `upload` | 3 / min | admin video routes (`/api/admin/lesson-video`, `/api/admin/reencode-video`), `/api/slip/upload` |
| `checkout` | 10 / min | `/api/admin/slips/bulk-*`, `/checkout/start` |
| `api` | 60 / min | other authenticated routes |

`/api/upload/*` itself is **not** rate-limited at the app layer because the
Vercel Firewall already covers it.

### `TRUST_PROXY_HEADERS`

`src/lib/rate-limit.ts` reads `x-vercel-forwarded-for`, `cf-connecting-ip`,
`x-real-ip`, and the **last** hop of `x-forwarded-for` (never the first — that
hop is attacker-controlled). Set `TRUST_PROXY_HEADERS=false` for direct-exposure
deployments where headers cannot be trusted.

### Multi-instance / serverless caveat

The bucket is per-process. Vercel functions usually run on a small number of
instances, and the Vercel Firewall is the actual enforcement; the app layer is
a backstop. If you ever scale to many instances and need exact per-IP quotas,
graduate to Upstash Redis or Cloudflare KV.

---

## Authentication

Better Auth 1.6 with the email + Google plugins. Sessions use HTTP-only cookies.

- Server reads use `getSession()` from `src/server/auth-session.ts` —
  React `cache()`-memoised, so a layout + page + RSC tree triggers **one**
  session lookup per request.
- Role check goes through `isAdmin(user)` from `src/lib/auth-utils.ts` rather
  than scattering `role === "admin"` literals.
- Forms use React Hook Form + `zodResolver(...)`. No manual `safeParse +
  setError` boilerplate.

---

## File uploads

| Surface | Limit | Path |
| --- | --- | --- |
| Slip upload | 5 MB · PNG / JPG / PDF / HEIC | `/api/slip/upload` |
| Course cover | 5 MB · image | `/api/upload/image` |
| Lesson image (Tiptap) | 5 MB · image | `/api/upload/lesson-image` |
| Lesson video | (Bunny TUS direct upload) | `/api/admin/lesson-video` |

Browser-reported MIME is treated as a hint; the server re-validates magic
bytes via `src/lib/file-sniff.ts`. The shared cap and accept lists live in
`src/lib/upload-limits.ts`.

---

## Testing

```
pnpm test                # 370+ unit tests
pnpm test:integration    # DB-backed tests (requires `pnpm db:up`)
pnpm e2e                 # Playwright critical flows
```

Coverage thresholds are enforced in `vitest.config.ts`. Current floor:
lines 25 / branches 70 / functions 45 / statements 25 — sized just below the
real numbers so a regression fails CI without the floor flickering on every
PR. Raise them as the codebase grows.

Skipped tests fail CI (`passWithNoTests: false` in vitest config) so a
careless `it.skip` doesn't silently disappear.

---

## Environment variables

`.env.example` is the source of truth — `src/lib/env.ts` validates every key
on first read. Notable ones:

| Key | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` | Better Auth signing + canonical URL |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET_*` | R2 / MinIO buckets |
| `S3_PUBLIC_BASE_URL` | Public CDN base for `coverImageUrl()` |
| `BUNNY_*` | Bunny Stream library, API key, signed-token secret |
| `BUNNY_WEBHOOK_SECRET` | HMAC verification for inbound video webhooks (fail-closed) |
| `EMAIL_FROM`, `SMTP_*` | Outbound mail |
| `ADMIN_NOTIFY_EMAIL` | Where new-slip notifications land |
| `TRUST_PROXY_HEADERS` | `true` (default) on Vercel; `false` for direct exposure |
| `CRON_SECRET` | Bearer token for Vercel Cron jobs |

Build-time fallbacks exist for `next build` page-data collection only —
never at runtime. `BETTER_AUTH_SECRET` has no fallback; a build without it
fails loudly.

---

## Deployment (Vercel)

1. Connect the repo to a Vercel project.
2. Add the env vars above (production scope).
3. Configure the **Firewall rule** described under [Rate limiting](#rate-limiting).
4. Set up Vercel Cron entries (see `vercel.json` for paths) with `CRON_SECRET`.
5. Push to `main` — Vercel handles the rest.

---

## Contributing

- Run `pnpm check` before opening a PR.
- Follow the patterns in `docs/adr/` — repos stay thin, services own
  business logic, server actions are auth-parse-call-return shells.
- New tables that have a `deleted_at` column: filter through
  `notDeleted(table)` everywhere.
- New TanStack Query consumers: add the key to `src/lib/query-keys.ts`,
  don't inline literals.
