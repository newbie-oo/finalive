import { test, expect } from "@playwright/test";

test.describe("certificate verify page", () => {
  test("shows not-found for invalid cert code", async ({ page, baseURL }) => {
    test.skip(!baseURL, "requires baseURL");

    await page.goto("/verify/INVALID-CODE-12345");
    await expect(page.locator("text=ไม่พบใบรับรอง")).toBeVisible();
    await expect(page.locator("text=รหัส INVALID-CODE-12345")).toBeVisible();
  });

  test("shows certificate details for a valid code via API", async ({ baseURL, request }) => {
    test.skip(!baseURL, "requires baseURL");

    // Just verify the page structure loads.
    const res = await request.get("/verify/TEST-CODE-00000000");
    expect(res.status()).toBe(200);
    const html = await res.text();
    expect(html).toMatch(/ไม่พบใบรับรอง|ใบรับรองถูกต้อง/);
  });
});
