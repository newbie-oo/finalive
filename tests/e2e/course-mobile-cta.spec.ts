import { test, expect } from "@playwright/test";

/**
 * Navigate to a real course detail page by going through /courses list.
 * This avoids hardcoding a slug that may not exist in the test DB.
 */
async function gotoFirstCourse(page: import("@playwright/test").Page) {
	await page.goto("/courses");
	const firstCard = page.locator("a[href^='/courses/']").first();
	await expect(firstCard).toBeVisible();
	await firstCard.click();
	await page.waitForURL(/\/courses\/.+/);
}

test("mobile course detail shows sticky enroll bar", async ({ page }) => {
	await page.setViewportSize({ width: 375, height: 667 });
	await gotoFirstCourse(page);
	const bar = page.getByTestId("mobile-course-cta");
	await expect(bar).toBeVisible();
	await expect(
		bar.locator("a, button").filter({ hasText: /ลงทะเบียน|เรียนฟรี/ }),
	).toBeVisible();
});

test("desktop course detail hides sticky enroll bar", async ({ page }) => {
	await page.setViewportSize({ width: 1280, height: 800 });
	await gotoFirstCourse(page);
	const bar = page.getByTestId("mobile-course-cta");
	await expect(bar).toBeHidden();
});
