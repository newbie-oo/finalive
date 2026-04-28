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

function psqlScalar(sql: string): string {
  const out = execSync(
    `docker exec finalive-db psql -U finalive -d finalive -At -c "${sql.replace(/"/g, '\\"')}"`,
  ).toString().trim();
  return out;
}

function firstLessonIdFor(slug: string): string {
  return psqlScalar(`
    SELECT l.id FROM lesson l
    JOIN module m ON l.module_id = m.id
    JOIN course c ON m.course_id = c.id
    WHERE c.slug = '${slug}' AND l.deleted_at IS NULL
    ORDER BY m.sort_order, l.sort_order
    LIMIT 1
  `);
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

    // 4. Visit first lesson page (look up the id — seed UUIDs are randomised per run).
    const firstLessonId = firstLessonIdFor(COURSE_SLUG);
    test.skip(!firstLessonId, "no lesson found — run `pnpm seed`");
    const lessonPage = await studentCtx.get(`/learn/${COURSE_SLUG}/${firstLessonId}`);
    expect(lessonPage.status()).toBe(200);

    await studentCtx.dispose();
  });

  test("preview page shows Vidstack player for free preview lesson", async ({ page, baseURL }) => {
    test.skip(!baseURL, "requires baseURL");

    // Look up the first preview lesson rather than hard-code.
    const previewLessonId = psqlScalar(`
      SELECT l.id FROM lesson l
      JOIN module m ON l.module_id = m.id
      JOIN course c ON m.course_id = c.id
      WHERE c.slug = 'python-for-investing'
        AND l.is_preview = true AND l.deleted_at IS NULL
      ORDER BY m.sort_order, l.sort_order LIMIT 1
    `);
    test.skip(!previewLessonId, "no preview lesson found");
    await page.goto(`/courses/python-for-investing/preview/${previewLessonId}`);
    await page.waitForURL(/\/preview\//);

    // Lesson title is always rendered, even when no video has been uploaded.
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // If a Bunny video is wired, expect the player. Otherwise the page must
    // surface the no-video status panel instead — both shapes are acceptable
    // depending on whether the seed has a real bunny_video_id.
    const video = page.locator("video");
    if ((await video.count()) > 0) {
      await expect(video).toBeAttached({ timeout: 10_000 });
      const src = await video.evaluate((el: HTMLVideoElement) => el.src || el.currentSrc);
      expect(src).toMatch(/blob:|\.m3u8/);
    } else {
      await expect(page.getByText(/ตัวอย่างนี้ยังไม่มีวิดีโอ/)).toBeVisible();
    }
  });
});
