import { test, expect, request as pwRequest } from "@playwright/test";
import { execSync } from "node:child_process";

const STUDENT = { email: "student-a@finalive.dev", password: "change-me" };
const COURSE_SLUG = "python-for-investing";

function psql(sql: string): void {
  execSync(
    `docker exec finalive-db psql -U finalive -d finalive -c "${sql.replace(/"/g, '\\"')}"`,
    { stdio: "pipe" },
  );
}

test.describe.configure({ mode: "serial" });

test.describe("learn flow", () => {
  test("student views learn page with Vidstack player", async ({ baseURL }) => {
    test.skip(!baseURL, "requires baseURL");

    // 1. Sign in.
    const studentCtx = await pwRequest.newContext({ baseURL });
    const signIn = await studentCtx.post("/api/auth/sign-in/email", {
      data: STUDENT,
      headers: { "content-type": "application/json" },
    });
    test.skip(
      signIn.status() !== 200,
      `seed missing? sign-in returned ${signIn.status()} — run \`pnpm seed\``,
    );

    // 2. Ensure enrollment exists (create via SQL if seed doesn't include it).
    psql(`
      INSERT INTO enrollment (user_id, course_id, source, status)
      SELECT u.id, c.id, 'free_course', 'active'
      FROM "user" u, course c
      WHERE u.email = '${STUDENT.email}' AND c.slug = '${COURSE_SLUG}'
      ON CONFLICT DO NOTHING
    `);

    // 3. Visit learn page.
    const learn = await studentCtx.get(`/learn/${COURSE_SLUG}`);
    expect(learn.status()).toBe(200);
    const html = await learn.text();
    expect(html).toMatch(/Python For Investing/i);

    // 4. Visit first lesson page.
    const lessonPage = await studentCtx.get(
      `/learn/${COURSE_SLUG}/75095747-3f89-4720-a1ad-b9708925f5cf`,
    );
    expect(lessonPage.status()).toBe(200);

    await studentCtx.dispose();
  });

  test("preview page shows Vidstack player for free preview lesson", async ({ page, baseURL }) => {
    test.skip(!baseURL, "requires baseURL");

    // Preview lesson for Python For Investing (seed course).
    await page.goto("/courses/python-for-investing/preview/75095747-3f89-4720-a1ad-b9708925f5cf");
    await page.waitForURL(/\/preview\//);

    // Vidstack player should mount (video element with HLS blob URL).
    const video = page.locator("video");
    await expect(video).toBeAttached({ timeout: 10_000 });
    const src = await video.evaluate((el: HTMLVideoElement) => el.src || el.currentSrc);
    expect(src).toMatch(/blob:|\.m3u8/);
  });
});
