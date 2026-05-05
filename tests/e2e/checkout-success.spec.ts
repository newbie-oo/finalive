import { test, expect } from "@playwright/test";

test("checkout success route exists and does not 404", async ({ page }) => {
	const response = await page.goto("/checkout/test-pending-1/success");
	// Should either render (200) or redirect to login (302/307), never 404
	expect(response?.status()).not.toBe(404);
	// After any redirect, we should not see the 404 page
	await expect(page.locator("text=ไม่พบหน้าที่คุณต้องการ")).toBeHidden();
});
