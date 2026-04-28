import { test, expect, request as pwRequest } from "@playwright/test";

// Full pay loop: student registers a pending, uploads slip, admin accepts,
// student gains active enrollment. Drives the journey through HTTP routes
// (auth + checkout + slip upload + admin accept) instead of UI clicks so
// the spec exercises the same code paths the UI calls without inheriting
// every layout-level brittleness.
//
// Prerequisites (run once before this spec):
//   - docker compose up -d db mailpit minio
//   - pnpm db:migrate
//   - pnpm seed   # admin@finalive.dev + student-a@finalive.dev (password 'change-me')
//   - pnpm dev    # or rely on playwright's webServer config
//
// Skips itself if the seed users are missing so a fresh checkout doesn't
// fail noisily — the assertion that this is a real end-to-end run lives
// in the CI seed step, not in this spec.

const STUDENT = { email: "student-a@finalive.dev", password: "change-me" };
const ADMIN = { email: "admin@finalive.dev", password: "change-me" };
const COURSE_SLUG = "python-for-investing";

// Tiny valid PNG (1x1 red pixel) so the file-sniff layer accepts the upload.
const ONE_PX_PNG = Buffer.from(
  "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000D4944415478DA63F8CFC0F0FF0F00050001005C0F0BAB0000000049454E44AE426082",
  "hex",
);

test.describe.configure({ mode: "serial" });

test.describe("full pay loop", () => {
  test("student pays, admin accepts, student gets enrollment", async ({ baseURL }) => {
    test.skip(!baseURL, "requires baseURL from playwright config");

    const studentCtx = await pwRequest.newContext({ baseURL });
    const adminCtx = await pwRequest.newContext({ baseURL });

    // 1. Student signs in.
    const studentSignIn = await studentCtx.post("/api/auth/sign-in/email", {
      data: STUDENT,
      headers: { "content-type": "application/json" },
    });
    test.skip(
      studentSignIn.status() !== 200,
      `seed missing? sign-in returned ${studentSignIn.status()} — run \`pnpm seed\``,
    );

    // 2. Start a pending enrollment via /checkout/start (form POST).
    const startRes = await studentCtx.post("/checkout/start", {
      form: { courseSlug: COURSE_SLUG },
      maxRedirects: 0,
    });
    expect([302, 303, 307]).toContain(startRes.status());
    const checkoutLocation = startRes.headers().location ?? "";
    const pendingId = checkoutLocation.match(/\/checkout\/([a-f0-9-]{36})/)?.[1];
    expect(pendingId, `start redirect must include pendingId; got ${checkoutLocation}`).toBeTruthy();

    // 3. Student uploads a slip.
    const uploadRes = await studentCtx.post("/api/slip/upload", {
      multipart: {
        pendingId: pendingId!,
        slip: {
          name: "slip.png",
          mimeType: "image/png",
          buffer: ONE_PX_PNG,
        },
      },
      maxRedirects: 0,
    });
    // Route returns 303 redirect on success.
    expect([200, 302, 303]).toContain(uploadRes.status());

    // 4. Admin signs in.
    const adminSignIn = await adminCtx.post("/api/auth/sign-in/email", {
      data: ADMIN,
      headers: { "content-type": "application/json" },
    });
    expect(adminSignIn.status()).toBe(200);

    // 5. Admin lists slips, finds the one we just uploaded.
    const queue = await adminCtx.get("/api/admin/slips?status=submitted&per_page=50");
    expect(queue.status()).toBe(200);
    const queueBody = (await queue.json()) as {
      data: Array<{ id: string; pendingId: string }>;
    };
    const slip = queueBody.data.find((s) => s.pendingId === pendingId);
    expect(slip, "uploaded slip must appear in admin queue").toBeTruthy();

    // 6. Admin accepts.
    const accept = await adminCtx.post(`/api/admin/slips/${slip!.id}/accept`);
    expect(accept.status()).toBe(200);
    const acceptBody = (await accept.json()) as { enrollmentId: string };
    expect(acceptBody.enrollmentId).toBeTruthy();

    // 7. Student's account page now shows the pending as paid.
    const account = await studentCtx.get("/account/enrollments");
    expect(account.status()).toBe(200);
    const accountHtml = await account.text();
    expect(accountHtml).toMatch(/พร้อมเรียน|paid|active/i);

    await studentCtx.dispose();
    await adminCtx.dispose();
  });
});
