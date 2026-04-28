import { test, expect } from "@playwright/test";
import { execSync } from "node:child_process";

// 1x1 red PNG for upload testing.
const ONE_PX_PNG = Buffer.from(
  "89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000D4944415478DA63F8CFC0F0FF0F00050001005C0F0BAB0000000049454E44AE426082",
  "hex",
);

const STUDENT = { email: "student-b@finalive.dev", password: "change-me" };
const ADMIN = { email: "admin@finalive.dev", password: "change-me" };
const COURSE_SLUG = "python-for-investing";

async function resetStudentPending(): Promise<void> {
  // Reset DB so each test starts with a fresh pending (no prior slip).
  const userSub = `(SELECT id FROM \\\"user\\\" WHERE email = '${STUDENT.email}')`;
  const sql = `
DELETE FROM certificate WHERE enrollment_id IN (SELECT id FROM enrollment WHERE source_pending_id IN (SELECT id FROM pending_enrollment WHERE user_id = ${userSub}));
DELETE FROM enrollment WHERE source_pending_id IN (SELECT id FROM pending_enrollment WHERE user_id = ${userSub});
DELETE FROM payment_slip WHERE pending_enrollment_id IN (SELECT id FROM pending_enrollment WHERE user_id = ${userSub});
DELETE FROM pending_enrollment WHERE user_id = ${userSub};
`;
  execSync(`docker exec finalive-db psql -U finalive -d finalive -c "${sql}"`, { stdio: "ignore" });
}

test.describe.configure({ mode: "serial" });

test.describe("checkout UI (4.5.11–4.5.13)", () => {
  test("checkout page shows countdown, bank info, and links to upload-slip", async ({ page }) => {
    await resetStudentPending();

    // Login
    await page.goto("/login");
    await page.getByLabel("อีเมล").fill(STUDENT.email);
    await page.getByLabel("รหัสผ่าน").fill(STUDENT.password);
    await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
    await page.waitForURL(/\/account/);

    // Start checkout
    await page.goto(`/courses/${COURSE_SLUG}`);
    await page.getByRole("button", { name: "ลงทะเบียน" }).click();
    await page.waitForURL(/\/checkout\/[a-f0-9-]{36}$/);

    // Assertions on checkout page
    await expect(page.getByRole("heading", { name: "ชำระเงิน" })).toBeVisible();
    await expect(page.locator("span.font-medium").filter({ hasText: "Python For Investing" })).toBeVisible();
    await expect(page.getByText(/฿1,290\.00/).first()).toBeVisible();
    await expect(page.getByText(/FL-/)).toBeVisible(); // ref code
    await expect(page.getByText(/\d{2}:\d{2}:\d{2}/)).toBeVisible(); // countdown
    await expect(page.getByText("โอนเข้าบัญชี")).toBeVisible();
    await expect(page.getByText("กสิกรไทย")).toBeVisible();

    // Navigate to upload-slip
    await page.getByRole("link", { name: "อัปโหลดสลิป" }).click();
    await page.waitForURL(/\/upload-slip$/);
    await expect(page.getByRole("heading", { name: "อัปโหลดสลิป" })).toBeVisible();
  });

  test("upload-slip: pick file → preview visible → submit → redirect", async ({ page }) => {
    await resetStudentPending();

    // Login
    await page.goto("/login");
    await page.getByLabel("อีเมล").fill(STUDENT.email);
    await page.getByLabel("รหัสผ่าน").fill(STUDENT.password);
    await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
    await page.waitForURL(/\/account/);

    // Start checkout
    await page.goto(`/courses/${COURSE_SLUG}`);
    await page.getByRole("button", { name: "ลงทะเบียน" }).click();
    await page.waitForURL(/\/checkout\/[a-f0-9-]{36}$/);

    // Go to upload-slip
    await page.getByRole("link", { name: "อัปโหลดสลิป" }).click();
    await page.waitForURL(/\/upload-slip$/);

    // Upload file
    const fileInput = page.locator('input[name="slip"]');
    await fileInput.setInputFiles({
      name: "slip.png",
      mimeType: "image/png",
      buffer: ONE_PX_PNG,
    });

    // Preview should appear
    await expect(page.locator('img[alt="ตัวอย่างสลิปที่อัปโหลด"]')).toBeVisible();

    // Submit (traditional form POST + redirect)
    await Promise.all([
      page.waitForURL(/\/checkout\/[a-f0-9-]{36}\/upload-slip$/),
      page.getByRole("button", { name: "ส่งสลิป" }).click(),
    ]);
    await page.waitForLoadState("networkidle");

    // Should show "already submitted" state
    await expect(page.getByText(/ส่งสลิปแล้ว|รอ admin/)).toBeVisible();
  });

  test("by-ref redirect: /checkout/by-ref/{refCode} → /checkout/{id}", async ({ page }) => {
    await resetStudentPending();

    // Login
    await page.goto("/login");
    await page.getByLabel("อีเมล").fill(STUDENT.email);
    await page.getByLabel("รหัสผ่าน").fill(STUDENT.password);
    await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
    await page.waitForURL(/\/account/);

    // Start checkout to get a ref code
    await page.goto(`/courses/${COURSE_SLUG}`);
    await page.getByRole("button", { name: "ลงทะเบียน" }).click();
    await page.waitForURL(/\/checkout\/[a-f0-9-]{36}$/);

    // Extract ref code from the page
    const refCode = await page.locator("text=/FL-[A-Z0-9]+/").first().textContent();
    test.skip(!refCode, "could not extract ref code");

    // Visit by-ref
    await page.goto(`/checkout/by-ref/${refCode!.trim()}`);
    await page.waitForURL(/\/checkout\/[a-f0-9-]{36}$/);
    await expect(page.getByRole("heading", { name: "ชำระเงิน" })).toBeVisible();
  });
});

test.describe("full pay loop UI (4.5.14)", () => {
  test("student uploads slip, admin accepts, student sees enrollment", async ({ page, browser }) => {
    await resetStudentPending();

    // --- Student side ---
    await page.goto("/login");
    await page.getByLabel("อีเมล").fill(STUDENT.email);
    await page.getByLabel("รหัสผ่าน").fill(STUDENT.password);
    await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
    await page.waitForURL(/\/account/);

    await page.goto(`/courses/${COURSE_SLUG}`);
    await page.getByRole("button", { name: "ลงทะเบียน" }).click();
    await page.waitForURL(/\/checkout\/[a-f0-9-]{36}$/);

    await page.getByRole("link", { name: "อัปโหลดสลิป" }).click();
    await page.waitForURL(/\/upload-slip$/);

    const fileInput = page.locator('input[name="slip"]');
    await fileInput.setInputFiles({
      name: "slip.png",
      mimeType: "image/png",
      buffer: ONE_PX_PNG,
    });
    await expect(page.locator('img[alt="ตัวอย่างสลิปที่อัปโหลด"]')).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/checkout\/[a-f0-9-]{36}\/upload-slip$/),
      page.getByRole("button", { name: "ส่งสลิป" }).click(),
    ]);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText(/ส่งสลิปแล้ว|รอ admin/)).toBeVisible();

    // Extract ref code for admin lookup
    const refCode = await page.locator("text=/FL-[A-Z0-9]+/").first().textContent();
    test.skip(!refCode, "could not extract ref code");

    // --- Admin side (new context) ---
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await adminPage.goto("/login");
    await adminPage.getByLabel("อีเมล").fill(ADMIN.email);
    await adminPage.getByLabel("รหัสผ่าน").fill(ADMIN.password);
    await adminPage.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
    await adminPage.waitForURL(/\/account|\/admin/);

    await adminPage.goto("/admin/slips");
    await expect(adminPage.getByRole("heading", { name: "คิวตรวจสลิป" })).toBeVisible();

    // Force refresh until slip appears (TanStack Query caches + polls every 30s)
    const slipLink = adminPage.getByRole("link", { name: new RegExp(refCode!.trim()) });
    for (let i = 0; i < 5; i += 1) {
      try {
        await expect(slipLink).toBeVisible({ timeout: 2000 });
        break;
      } catch {
        await adminPage.reload();
      }
    }
    await expect(slipLink).toBeVisible();
    await slipLink.click();

    // Accept via hotkey 'a'
    await adminPage.keyboard.press("a");
    // After accept, slip leaves the "submitted" queue.
    await expect(adminPage.getByText(/ไม่มีสลิปในคิวนี้/)).toBeVisible();

    // Verify slip moved to "accepted" queue
    await adminPage.goto("/admin/slips?status=accepted");
    await expect(adminPage.getByRole("link", { name: new RegExp(refCode!.trim()) })).toBeVisible();

    await adminContext.close();

    // --- Student verifies enrollment ---
    await page.goto("/account/enrollments");
    await expect(page.getByText(/พร้อมเรียน|paid/)).toBeVisible();
  });
});
