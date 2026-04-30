import { test, expect } from "@playwright/test";

test("courses filter debounces query into the URL without a Submit click", async ({
  page,
}) => {
  await page.goto("/courses");
  const search = page.getByPlaceholder("ค้นหาคอร์ส (ชื่อหรือคำอธิบาย)");
  await search.fill("fin");
  // Debounce is 300ms; allow margin for test runner / hydration.
  await expect(page).toHaveURL(/\/courses\?.*q=fin/, { timeout: 2_000 });

  // Toggling the free-only checkbox propagates to the URL too.
  await page.getByLabel("เฉพาะคอร์สฟรี").check();
  await expect(page).toHaveURL(/\/courses\?.*free=1/, { timeout: 2_000 });
});

test("courses filter clears all params on reset", async ({ page }) => {
  await page.goto("/courses?q=fin&free=1");
  await page.getByRole("button", { name: "ล้างตัวกรอง" }).click();
  await expect(page).toHaveURL("/courses", { timeout: 2_000 });
});
