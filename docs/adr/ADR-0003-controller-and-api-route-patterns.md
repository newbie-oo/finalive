# ADR-0003: Controller and API Route Patterns

## Status

Accepted

## Context

Our Next.js App Router has 20+ API routes (`src/app/api/**/route.ts`). Before this ADR, every route hand-rolled its own:

- auth check (`requireSession`, `requireRole`)
- rate-limit check
- body/query parsing
- error formatting (ZodError vs ApiError vs unknown)
- response shape (`{ code, message }` vs `{ ok, data }`)

This produced inconsistent error responses, duplicated boilerplate, and made it easy to forget auth or rate-limit on new routes.

We needed a **thin, declarative wrapper** that enforces cross-cutting concerns so route handlers focus purely on business logic.

## Decision

We will standardize on three wrappers:

1. **`apiRoute`** — for routes that parse JSON body + optional query params
2. **`apiRouteRaw`** — for routes that parse their own body (FormData, multipart, webhook)
3. **`cronRoute`** — for cron jobs that verify a shared secret instead of session auth

### Layered flow

Every wrapped route follows this exact sequence:

```
1. Rate-limit (IP-based, checked before auth to avoid burning session lookups)
2. Auth ("required" | "admin" | none)
3. Query validation (Zod, optional)
4. Body validation (Zod for apiRoute; skipped for apiRouteRaw/cronRoute)
5. Handler (business logic only)
6. Wrap result → JSON response
7. Catch errors → standardized { code, message, request_id }
```

### Error contract

All errors return `NextResponse.json({ code, message, request_id }, { status })`.

| Error type               | HTTP status | Example `code`      |
| ------------------------ | ----------- | ------------------- |
| ZodError                 | 400         | `validation_failed` |
| ApiError("not_found")    | 404         | `not_found`         |
| ApiError("forbidden")    | 403         | `forbidden`         |
| ApiError("rate_limited") | 429         | `rate_limited`      |
| Unknown                  | 500         | `internal_error`    |

### Auth requirement mapping

| Route type    | `auth` value | Real check                  |
| ------------- | ------------ | --------------------------- |
| Public        | omitted      | none                        |
| Authenticated | `"required"` | `requireSessionThrow()`     |
| Admin only    | `"admin"`    | `requireRoleThrow("admin")` |
| Cron          | `cronRoute`  | `verifyCronSecret()`        |

## Consequences

### Positive

- **Consistency**: every route returns the same error shape
- **Security**: cannot forget auth or rate-limit (enforced by wrapper)
- **Testability**: handlers are pure functions `(ctx) => data`; auth/parse/format tested once in wrapper
- **Maintainability**: adding new concern (e.g. request logging) means changing one file

### Negative

- **Learning curve**: new devs must know which wrapper to use
- **Less flexibility**: routes with exotic auth patterns need custom code or wrapper extension

## Migration notes

Routes already using wrappers:

- `api/learn/start`, `api/learn/progress`
- `api/slip/upload`
- `api/upload/image`, `api/upload/lesson-image`
- `api/admin/slips/*` (all 6 routes)
- `api/admin/video-status`, `api/admin/reencode-video`
- `api/config/oauth`
- `api/checkout/[pendingId]/status`
- `api/webhooks/bunny`
- `api/cron/*` (4 routes)

Routes still hand-rolled (by design or pending refactor):

- `api/auth/[...all]` — Better Auth handler, never wrap
- `api/admin/lesson-video` — complex inline DB wiring in `makeService()`, needs repo extraction first

## References

- `src/lib/api-route.ts` — wrapper implementations
- `src/lib/cron-route.ts` — cron wrapper
- ADR-0001 — Certificate and Slip Service Architecture
- ADR-0002 — Repository Seams and Shared Query Patterns
