# Finalive Domain Model

## Core Concepts

### Course

A structured learning product containing modules, lessons, and quizzes. The central aggregate of the platform.

- **Published Course** — visible to students, can be enrolled.
- **Draft Course** — under construction, visible only to admins/instructors.
- **Archived Course** — no longer accepting enrollments.

### Module

A grouping of lessons within a course. Ordered by `sortOrder`.

### Lesson

A unit of learning content. May contain:

- Video ( Bunny Stream )
- Written content ( Markdown body )
- Quiz

### Enrollment

A student's access grant to a course.

- **Free enrollment** — `source: "free"`, no payment.
- **Paid enrollment** — `source: "paid"`, via payment slip or direct purchase.
- **Admin grant** — `source: "admin_grant"`, gifted by admin.
- **Active** — student can access content.
- **Cancelled** — no longer active.

### Pending Enrollment

An enrollment intent that has not been paid yet. Contains:

- `refCode` — unique reference for payment matching
- `amount` — price at time of creation
- `expiresAt` — deadline for payment

### Payment Slip

Proof of bank transfer uploaded by a student. Lifecycle:

- `submitted` → `accepted` / `rejected`

### Certificate

A verifiable PDF credential issued upon course completion. Contains:

- `certCode` — unique verification code
- `pdfUrl` — signed URL to PDF

### Progress

Student's lesson completion tracking.

- `watchedSeconds` — video watch time
- `status` — `not_started` / `in_progress` / `completed`

### Curriculum

The complete tree of modules and lessons for a course. Assembled by `curriculum-repo.ts`.

### Admin

Platform administrator with elevated permissions. Can:

- Create/edit courses
- Review payment slips
- Grant enrollments
- Manage users

### Collaborator

A user with limited admin access to a specific course. Roles:

- `editor` — can edit content
- `viewer` — can view analytics

## Architecture Terms

- **Action** — Next.js server action. Thin HTTP adapter: auth → parse → delegate.
- **Service** — Business logic module. Pure orchestration, injected dependencies.
- **Repository** — Data access module. Thin SQL mapping, owns `db` imports.
- **Adapter** — Concrete implementation of an interface (e.g., `R2ObjectStorage`).
- **Container** — Composition root. Wires adapters into services.
