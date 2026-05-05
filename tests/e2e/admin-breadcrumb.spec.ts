import { test, expect } from "@playwright/test";

test("admin breadcrumb route exists and does not 404", async ({ page }) => {
	const response = await page.goto("/admin/courses/test-course/curriculum");
	// Should redirect to login (not 404) since admin requires auth
	expect(response?.status()).not.toBe(404);
	await expect(page.locator("text=ไม่พบหน้าที่คุณต้องการ")).toBeHidden();
});
