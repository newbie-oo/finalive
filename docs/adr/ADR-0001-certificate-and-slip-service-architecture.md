# ADR-0001: Extract Application Services from Server Actions

## Status

accepted

## Context

The core business workflows — certificate issuance, payment slip upload, slip review — were implemented directly inside Next.js server actions. This made them:

- **Untestable** — they depend on `headers()`, `redirect()`, the global `db` client, R2 network calls, and email dispatch at module level
- **Tightly coupled to Next.js** — business logic is welded to framework primitives
- **Duplicated** — auth/session guards, error handling, and revalidation are copy-pasted across every action
- **Shallow** — the interface surface (FormData parsing, auth checks, revalidation paths) is nearly as large as the implementation

We needed a pattern to separate **domain orchestration** from **HTTP transport** so that business workflows can be unit-tested with in-memory fakes.

## Decision

Adopt a **layered architecture** for server actions:

```
Action (HTTP transport)
  → Auth / input validation
  → Application Service (domain orchestration)
    → Repositories (data access)
    → Injected infrastructure interfaces (storage, notifier, renderer)
```

### Rules

1. **Auth stays in the action.** Session resolution, role checks, and redirects are HTTP concerns. The action passes a resolved `UserContext` to the service.

2. **Domain logic lives in the service.** Business rules, orchestration sequences, and error handling are owned by a named application service (e.g. `CertificateIssuer`, `SlipUploadService`).

3. **Infrastructure is injected.** Side-effectful dependencies — PDF rendering, object storage, email notification — are passed as constructor arguments implementing small interfaces.

4. **Repositories are direct imports.** Data access is thin SQL mapping; mocking it in tests is tractable. We do not introduce repository interfaces until test speed or multi-database support demands it.

5. **Services return typed results.** Domain errors are encoded in the return type (`{ ok: false, error: "not_found" }`), not thrown as exceptions. Infrastructure failures (network, storage) may throw.

### Interfaces

| Interface                  | Purpose                                    | Implementations                 |
| -------------------------- | ------------------------------------------ | ------------------------------- |
| `CertificateRenderer`      | Render a PDF certificate                   | `ReactPdfCertificateRenderer`   |
| `ObjectStorage`            | Put objects and resolve public URLs        | `R2ObjectStorage`               |
| `CourseCompletionNotifier` | Notify student of certificate availability | `EmailCourseCompletionNotifier` |
| `SlipNotifier`             | Notify student and admin of slip events    | `EmailSlipNotifier`             |
| `AuditLogger`              | Write audit log entries (supports tx)      | `DbAuditLogger`                 |

## Consequences

### Positive

- **Testability.** Application services can be unit-tested with pure fakes — no real DB, no real R2, no real email. Tests run in milliseconds.
- **Locality.** A bug in certificate logic lives in one module. A bug in slip upload lives in one module.
- **Leverage.** New upload types reuse `ObjectStorage`. New notifications reuse `SlipNotifier`.
- **Framework independence.** The same service can be called from server actions, API routes, cron jobs, or CLI scripts.

### Negative

- **More files.** Each service adds ~3 files (interface, implementation, tests) plus adapter files for infrastructure.
- **Constructor plumbing.** Actions must instantiate services with real adapters. A dependency injection container would reduce this, but we do not yet have enough services to justify one.
- **Mock brittleness in tests.** Mocking `db` queries requires tracking call order when the service makes multiple selects. Table-driven tests with mock setup helpers mitigate this.

## Validation

- `CertificateIssuer` extracted from `src/server/actions/certificate.tsx` — action reduced from 119 to 15 lines; 8 unit tests cover every path.
- `SlipUploadService` extracted from `src/server/actions/slip.ts` — action reduced from 140 to ~20 lines; tests cover validation, idempotency, transaction failure, and success.
- `SlipReviewService` extracted from `src/server/actions/admin-slip.ts` — action reduced from 200 to ~25 lines; tests cover accept/reject success, race conditions, unique violations, bulk operations with partial failures.

## References

- `src/server/certificates/certificate-issuer.ts`
- `src/server/certificates/certificate-issuer.test.ts`
- `src/server/services/storage.ts`
- `src/server/services/notifier.ts`
- `src/server/services/slip-notifier.ts`
- `src/server/payments/slip-upload-service.ts`
- `src/server/payments/slip-review-service.ts`
- `src/server/payments/slip-review-service.test.ts`
- `src/server/services/audit-logger.ts`
