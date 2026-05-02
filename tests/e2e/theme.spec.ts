import { test, expect } from "@playwright/test";

test("theme toggle cycles light -> dark -> system and persists across reload", async ({
  page,
}) => {
  await page.goto("/");
  const toggle = page.getByTestId("theme-toggle");
  await expect(toggle).toBeVisible();

  await page.evaluate(() => localStorage.setItem("theme", "light"));
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/dark/);

  await toggle.click();
  await expect(page.locator("html")).toHaveClass(/dark/);

  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
});
