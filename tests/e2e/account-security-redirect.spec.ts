import { test, expect } from "@playwright/test";

test("/account/security is permanently redirected to /account", async ({
  request,
}) => {
  const res = await request.get("/account/security", { maxRedirects: 0 });
  expect([301, 308]).toContain(res.status());
  expect(res.headers().location ?? "").toMatch(/\/account$/);
});
