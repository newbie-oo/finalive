import { describe, it, expect, vi } from "vitest";
import { ApiError } from "@/lib/api-error";
import { CourseGrantService } from "./course-grant";

vi.mock("server-only", () => ({}));

function fakeDeps(
  overrides?: Partial<{
    hasActiveEnrollment: ReturnType<typeof vi.fn>;
    createGrant: ReturnType<typeof vi.fn>;
    createEnrollment: ReturnType<typeof vi.fn>;
    getStudentContact: ReturnType<typeof vi.fn>;
    getCourseInfo: ReturnType<typeof vi.fn>;
    sendNotification: ReturnType<typeof vi.fn>;
  }>,
) {
  return {
    hasActiveEnrollment: vi.fn().mockResolvedValue(false),
    createGrant: vi.fn().mockResolvedValue("grant-1"),
    createEnrollment: vi.fn().mockResolvedValue(undefined),
    getStudentContact: vi
      .fn()
      .mockResolvedValue({ email: "student@test.com", name: "Student" }),
    getCourseInfo: vi
      .fn()
      .mockResolvedValue({ title: "Test Course", slug: "test-course" }),
    sendNotification: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("CourseGrantService", () => {
  it("grants course access and returns grant id", async () => {
    const deps = fakeDeps();
    const svc = new CourseGrantService(deps);
    const result = await svc.grant({
      adminUserId: "admin-1",
      studentUserId: "student-1",
      courseId: "course-1",
      reason: "gift",
      note: "Happy learning",
      baseUrl: "https://example.com",
    });
    expect(result).toEqual({ ok: true, grantId: "grant-1" });
    expect(deps.createEnrollment).toHaveBeenCalledWith({
      userId: "student-1",
      courseId: "course-1",
      grantId: "grant-1",
    });
  });

  it("sends notification with correct learn url", async () => {
    const deps = fakeDeps();
    const svc = new CourseGrantService(deps);
    await svc.grant({
      adminUserId: "admin-1",
      studentUserId: "student-1",
      courseId: "course-1",
      reason: "promo",
      note: undefined,
      baseUrl: "https://example.com",
    });
    expect(deps.sendNotification).toHaveBeenCalledWith({
      to: "student@test.com",
      name: "Student",
      courseTitle: "Test Course",
      learnUrl: "https://example.com/learn/test-course",
    });
  });

  it("throws conflict when already enrolled", async () => {
    const deps = fakeDeps({
      hasActiveEnrollment: vi.fn().mockResolvedValue(true),
    });
    const svc = new CourseGrantService(deps);
    await expect(
      svc.grant({
        adminUserId: "admin-1",
        studentUserId: "student-1",
        courseId: "course-1",
        reason: "gift",
        note: undefined,
        baseUrl: "https://example.com",
      }),
    ).rejects.toThrow(ApiError);
    expect(deps.createGrant).not.toHaveBeenCalled();
  });

  it("swallows notification errors gracefully", async () => {
    const deps = fakeDeps({
      sendNotification: vi.fn().mockRejectedValue(new Error("SMTP down")),
    });
    const svc = new CourseGrantService(deps);
    const result = await svc.grant({
      adminUserId: "admin-1",
      studentUserId: "student-1",
      courseId: "course-1",
      reason: "gift",
      note: undefined,
      baseUrl: "https://example.com",
    });
    expect(result.ok).toBe(true);
  });

  it("skips notification when student or course not found", async () => {
    const deps = fakeDeps({
      getStudentContact: vi.fn().mockResolvedValue(null),
    });
    const svc = new CourseGrantService(deps);
    await svc.grant({
      adminUserId: "admin-1",
      studentUserId: "student-1",
      courseId: "course-1",
      reason: "gift",
      note: undefined,
      baseUrl: "https://example.com",
    });
    expect(deps.sendNotification).not.toHaveBeenCalled();
  });

  it("skips notification when sendNotification is not provided", async () => {
    const deps = fakeDeps();
    delete (deps as Record<string, unknown>).sendNotification;
    const svc = new CourseGrantService(deps);
    await svc.grant({
      adminUserId: "admin-1",
      studentUserId: "student-1",
      courseId: "course-1",
      reason: "gift",
      note: undefined,
      baseUrl: "https://example.com",
    });
    expect(deps.getStudentContact).not.toHaveBeenCalled();
  });
});
