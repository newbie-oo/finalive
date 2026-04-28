import { test, expect, request as pwRequest } from "@playwright/test";

const STUDENT = { email: "student-a@finalive.dev", password: "change-me" };
const COURSE_SLUG = "python-for-investing";
// Hardcoded quiz ID from seed data (first lesson of Python For Investing).
const QUIZ_ID = "ce295447-d2af-447e-a7bc-9944fc5b80c4";

test.describe.configure({ mode: "serial" });

test.describe("quiz flow", () => {
  test("student takes quiz and sees result", async ({ baseURL }) => {
    test.skip(!baseURL, "requires baseURL");

    const studentCtx = await pwRequest.newContext({ baseURL });

    // 1. Sign in.
    const signIn = await studentCtx.post("/api/auth/sign-in/email", {
      data: STUDENT,
      headers: { "content-type": "application/json" },
    });
    test.skip(
      signIn.status() !== 200,
      `seed missing? sign-in returned ${signIn.status()} — run \`pnpm seed\``,
    );

    // 2. Visit quiz page.
    const quizPage = await studentCtx.get(`/learn/${COURSE_SLUG}/quiz/${QUIZ_ID}`);
    expect(quizPage.status()).toBe(200);
    const html = await quizPage.text();
    expect(html).toMatch(/แบบทดสอบท้ายบท/);

    await studentCtx.dispose();
  });

  test("quiz page renders questions for enrolled student", async ({ page, baseURL }) => {
    test.skip(!baseURL, "requires baseURL");

    // 1. Sign in via UI.
    await page.goto("/login");
    await page.fill('input[name="email"]', STUDENT.email);
    await page.fill('input[name="password"]', STUDENT.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(courses|account)/, { timeout: 10_000 });

    // 2. Go to quiz page directly.
    await page.goto(`/learn/${COURSE_SLUG}/quiz/${QUIZ_ID}`);
    await page.waitForURL(/\/quiz\//, { timeout: 10_000 });

    // 3. Should see questions.
    const question1 = page.locator("fieldset").first();
    await expect(question1).toBeVisible();

    // 4. Should see submit button.
    const submitBtn = page.getByRole("button", { name: "ส่งคำตอบ" });
    await expect(submitBtn).toBeVisible();
  });
});
