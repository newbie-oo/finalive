import { test, expect } from "@playwright/test";

// /admin/slips is gated by middleware; without auth we get redirected to
// /login?next=... — so smoke-assert the redirect rather than the page
// itself. The full split-pane behaviour is covered manually until an
// authenticated admin fixture lands.
test("/admin/slips requires authentication", async ({ request }) => {
  const res = await request.get("/admin/slips?status=submitted", {
    maxRedirects: 0,
  });
  expect([301, 302, 303, 307, 308]).toContain(res.status());
  expect(res.headers().location ?? "").toMatch(/\/login/);
});
