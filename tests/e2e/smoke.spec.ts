import { test, expect } from "@playwright/test";

test("home page responds 200 and renders", async ({ page }) => {
  const response = await page.goto("/");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle(/.+/);
});

test("courses page responds 200", async ({ page }) => {
  const response = await page.goto("/courses");
  expect(response?.status()).toBe(200);
});

test("course detail page responds 200", async ({ page }) => {
  // This assumes at least one published course exists in the seeded db.
  const response = await page.goto("/courses/python-for-investing");
  expect(response?.status()).toBe(200);
});

test("login page responds 200", async ({ page }) => {
  const response = await page.goto("/login");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: /เข้าสู่ระบบ/ })).toBeVisible();
});

test("register page responds 200", async ({ page }) => {
  const response = await page.goto("/register");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: /สมัครสมาชิก/ })).toBeVisible();
});

test("legal pages respond 200", async ({ page }) => {
  const terms = await page.goto("/legal/terms");
  expect(terms?.status()).toBe(200);
  const privacy = await page.goto("/legal/privacy");
  expect(privacy?.status()).toBe(200);
});
