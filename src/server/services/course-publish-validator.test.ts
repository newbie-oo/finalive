import { describe, it, expect, vi } from "vitest";
import { CoursePublishValidator } from "./course-publish-validator";
import type { CurriculumModule } from "@/server/repos/course";

vi.mock("server-only", () => ({}));

function makeDeps(
  overrides?: Partial<{
    getCourseMeta: ReturnType<typeof vi.fn>;
    getCurriculum: ReturnType<typeof vi.fn>;
    getLessons: ReturnType<typeof vi.fn>;
  }>,
) {
  return {
    getCourseMeta: vi
      .fn()
      .mockResolvedValue({ title: "Test Course", summary: "A test course" }),
    getCurriculum: vi.fn().mockResolvedValue([
      {
        id: "m1",
        title: "Module 1",
        sortOrder: 0,
        lessons: [
          {
            id: "l1",
            title: "Lesson 1",
            durationSeconds: null,
            isPreview: false,
            isFree: false,
            sortOrder: 0,
          },
        ],
      },
    ] as CurriculumModule[]),
    getLessons: vi.fn().mockResolvedValue([
      {
        id: "l1",
        title: "Lesson 1",
        bodyMd:
          "This is a sufficiently long lesson body that contains enough meaningful content to pass the minimum character threshold for publishing a course on the platform.",
        videoMediaId: null,
      },
    ]),
    ...overrides,
  };
}

describe("CoursePublishValidator", () => {
  it("passes when course is complete", async () => {
    const deps = makeDeps();
    const validator = new CoursePublishValidator(deps);
    const result = await validator.validate("c1");
    expect(result).toEqual({ ok: true });
  });

  it("fails when course not found", async () => {
    const deps = makeDeps({ getCourseMeta: vi.fn().mockResolvedValue(null) });
    const validator = new CoursePublishValidator(deps);
    const result = await validator.validate("c1");
    expect(result).toEqual({ ok: false, errors: ["course not found"] });
  });

  it("fails when title is empty", async () => {
    const deps = makeDeps({
      getCourseMeta: vi.fn().mockResolvedValue({ title: "", summary: "OK" }),
    });
    const validator = new CoursePublishValidator(deps);
    const result = await validator.validate("c1");
    expect(result).toEqual({
      ok: false,
      errors: expect.arrayContaining(["ชื่อคอร์สว่างเปล่า"]),
    });
  });

  it("fails when summary is empty", async () => {
    const deps = makeDeps({
      getCourseMeta: vi.fn().mockResolvedValue({ title: "OK", summary: "" }),
    });
    const validator = new CoursePublishValidator(deps);
    const result = await validator.validate("c1");
    expect(result).toEqual({
      ok: false,
      errors: expect.arrayContaining(["คำอธิบายคอร์สว่างเปล่า"]),
    });
  });

  it("fails when no modules", async () => {
    const deps = makeDeps({ getCurriculum: vi.fn().mockResolvedValue([]) });
    const validator = new CoursePublishValidator(deps);
    const result = await validator.validate("c1");
    expect(result).toEqual({
      ok: false,
      errors: expect.arrayContaining(["ยังไม่มีโมดูล", "ยังไม่มีบทเรียน"]),
    });
  });

  it("fails when lesson has placeholder body", async () => {
    const deps = makeDeps({
      getLessons: vi.fn().mockResolvedValue([
        {
          id: "l1",
          title: "Lesson 1",
          bodyMd: "ภาพรวมของหัวข้อ และวิธีนำไปใช้จริง",
          videoMediaId: null,
        },
      ]),
    });
    const validator = new CoursePublishValidator(deps);
    const result = await validator.validate("c1");
    expect(result).toEqual({
      ok: false,
      errors: expect.arrayContaining([expect.stringContaining("placeholder")]),
    });
  });

  it("fails when lesson has insufficient body without video", async () => {
    const deps = makeDeps({
      getLessons: vi
        .fn()
        .mockResolvedValue([
          { id: "l1", title: "Lesson 1", bodyMd: "Hi", videoMediaId: null },
        ]),
    });
    const validator = new CoursePublishValidator(deps);
    const result = await validator.validate("c1");
    expect(result).toEqual({
      ok: false,
      errors: expect.arrayContaining([
        expect.stringContaining("เนื้อหาว่างหรือสั้นเกินไป"),
      ]),
    });
  });

  it("passes when lesson has video even with short body", async () => {
    const deps = makeDeps({
      getLessons: vi
        .fn()
        .mockResolvedValue([
          { id: "l1", title: "Lesson 1", bodyMd: "Hi", videoMediaId: "vid-1" },
        ]),
    });
    const validator = new CoursePublishValidator(deps);
    const result = await validator.validate("c1");
    expect(result).toEqual({ ok: true });
  });
});
