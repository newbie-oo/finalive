import { test, expect, type Page } from "@playwright/test";

/**
 * Exploratory tour — walks every page a real user/admin would hit and
 * asserts the structural UX invariants that are easy to regress and
 * hard to spot in unit tests:
 *
 *   - exactly one <h1> per page (document outline)
 *   - no console errors at page load (catches client crashes,
 *     hydration mismatches, missing assets)
 *   - all <img> elements have non-empty `alt`
 *   - all interactive controls (button/link) have an accessible name
 *
 * Per-page screenshots are saved under `test-results/tour/` so a
 * human can scan them after a run. The asserts are deliberately
 * forgiving — we want signal, not noise.
 */

const STUDENT = { email: "student-a@finalive.dev", password: "change-me" };
const ADMIN = { email: "admin@finalive.dev", password: "change-me" };

interface PageCheck {
  ok: boolean;
  reasons: string[];
}

async function checkPage(page: Page, name: string): Promise<PageCheck> {
  const reasons: string[] = [];

  // 1. Exactly one h1.
  const h1Count = await page.locator("h1").count();
  if (h1Count === 0) reasons.push("no <h1>");
  if (h1Count > 1) reasons.push(`${h1Count} <h1> elements (expected 1)`);

  // 2. <img> elements have alt.
  const imgs = page.locator("img");
  const imgCount = await imgs.count();
  for (let i = 0; i < imgCount; i++) {
    const alt = await imgs.nth(i).getAttribute("alt");
    if (alt === null || alt === "") {
      const src = await imgs.nth(i).getAttribute("src");
      reasons.push(`img missing alt: ${src ?? "?"}`);
    }
  }

  // 3. Buttons/links have an accessible name. (Allow icon-only buttons
  // that carry aria-label.)
  for (const role of ["button", "link"] as const) {
    const els = page.getByRole(role);
    const total = await els.count();
    for (let i = 0; i < total; i++) {
      const el = els.nth(i);
      const name = (await el.getAttribute("aria-label"))
        ?? (await el.getAttribute("title"))
        ?? (await el.textContent());
      if (!name || name.trim() === "") {
        reasons.push(`${role} #${i} has no accessible name`);
      }
    }
  }

  await page.screenshot({
    path: `test-results/tour/${name}.png`,
    fullPage: true,
  });
  return { ok: reasons.length === 0, reasons };
}

async function login(page: Page, who: { email: string; password: string }) {
  await page.goto("/login");
  await page.getByLabel("อีเมล").fill(who.email);
  await page.getByLabel("รหัสผ่าน").fill(who.password);
  await page.getByRole("button", { name: "เข้าสู่ระบบ", exact: true }).click();
  await page.waitForURL(/\/(account|admin)/);
}

test.describe("exploratory tour", () => {
  test("public pages render cleanly without console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
    });

    const stops: { url: string; name: string }[] = [
      { url: "/", name: "01-home" },
      { url: "/courses", name: "02-courses" },
      { url: "/courses/python-for-investing", name: "03-course-detail" },
      { url: "/courses/free-intro-course", name: "04-free-course" },
      { url: "/login", name: "05-login" },
      { url: "/register", name: "06-register" },
      { url: "/forgot-password", name: "07-forgot-password" },
      { url: "/legal/terms", name: "08-terms" },
      { url: "/legal/privacy", name: "09-privacy" },
    ];

    const allReasons: Record<string, string[]> = {};
    for (const stop of stops) {
      await page.goto(stop.url);
      await page.waitForLoadState("domcontentloaded");
      const { ok, reasons } = await checkPage(page, stop.name);
      if (!ok) allReasons[stop.url] = reasons;
    }

    expect(errors, `console errors:\n${errors.join("\n")}`).toEqual([]);
    expect(allReasons, `UX issues:\n${JSON.stringify(allReasons, null, 2)}`).toEqual({});
  });

  test("student tour", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
    });

    await login(page, STUDENT);
    const stops: { url: string; name: string }[] = [
      { url: "/account", name: "10-account" },
      { url: "/account/enrollments", name: "11-enrollments" },
      { url: "/account/certificates", name: "12-certificates" },
      { url: "/account/security", name: "13-security" },
      { url: "/learn/python-for-investing", name: "14-learn-course" },
    ];

    const allReasons: Record<string, string[]> = {};
    for (const stop of stops) {
      await page.goto(stop.url);
      await page.waitForLoadState("domcontentloaded");
      const { ok, reasons } = await checkPage(page, stop.name);
      if (!ok) allReasons[stop.url] = reasons;
    }

    expect(errors, `console errors:\n${errors.join("\n")}`).toEqual([]);
    expect(allReasons, `UX issues:\n${JSON.stringify(allReasons, null, 2)}`).toEqual({});
  });

  test("admin tour", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
    page.on("console", (m) => {
      if (m.type() === "error") errors.push(`console.error: ${m.text()}`);
    });

    await login(page, ADMIN);
    const stops: { url: string; name: string }[] = [
      { url: "/admin", name: "20-admin-dashboard" },
      { url: "/admin/slips", name: "21-admin-slips" },
      { url: "/admin/courses", name: "22-admin-courses" },
      { url: "/admin/users", name: "23-admin-users" },
      { url: "/admin/certificates", name: "24-admin-certificates" },
    ];

    const allReasons: Record<string, string[]> = {};
    for (const stop of stops) {
      await page.goto(stop.url);
      await page.waitForLoadState("domcontentloaded");
      const { ok, reasons } = await checkPage(page, stop.name);
      if (!ok) allReasons[stop.url] = reasons;
    }

    expect(errors, `console errors:\n${errors.join("\n")}`).toEqual([]);
    expect(allReasons, `UX issues:\n${JSON.stringify(allReasons, null, 2)}`).toEqual({});
  });
});
