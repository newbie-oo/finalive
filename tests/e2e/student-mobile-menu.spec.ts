import { test, expect } from "@playwright/test";

test("mobile menu opens and shows navigation links", async ({ page }) => {
	await page.setViewportSize({ width: 375, height: 667 });
	await page.goto("/");

	const toggle = page.getByRole("button", { name: /เปิดเมนู/ });
	await expect(toggle).toBeVisible();
	await toggle.click();

	const drawer = page.getByRole("navigation", { name: /เมนูมือถือ/ });
	await expect(drawer).toBeVisible();

	// Verify nav links are present in drawer
	await expect(drawer.getByRole("link", { name: /คอร์ส/ })).toBeVisible();
	await expect(drawer.getByRole("link", { name: /ผู้สอน/ })).toBeVisible();

	// Click a link and verify navigation
	await drawer.getByRole("link", { name: /คอร์ส/ }).click();
	await page.waitForURL("/courses");
});
