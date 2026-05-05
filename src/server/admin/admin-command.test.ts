import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

vi.mock("@/db/client", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({ limit: async () => [] }),
      }),
    }),
  },
}));

const mockGetSession = vi.fn();
vi.mock("@/server/auth-session", () => ({
  getSession: mockGetSession,
}));

const mockCanEditCoursePure = vi.fn();
vi.mock("@/server/services/course-authz", () => ({
  canEditCoursePure: mockCanEditCoursePure,
}));

const mockGetAdminCourseById = vi.fn();
vi.mock("@/server/repos/admin-course", () => ({
  getAdminCourseById: mockGetAdminCourseById,
}));

const { requireAdminSession, requireCourseAccess, revalidateCourseAdminPaths } =
  await import("./admin-command");

const fakeSession = {
  sessionId: "s1",
  user: {
    id: "u1",
    email: "a@b",
    name: "A",
    role: "admin" as const,
    emailVerified: true,
  },
};

describe("requireAdminSession", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
  });

  it("returns session when authenticated", async () => {
    mockGetSession.mockResolvedValue(fakeSession);
    const result = await requireAdminSession();
    expect(result).toEqual({ ok: true, session: fakeSession });
  });

  it("returns unauthorized when no session", async () => {
    mockGetSession.mockResolvedValue(null);
    const result = await requireAdminSession();
    expect(result).toEqual({ ok: false, error: "unauthorized" });
  });
});

describe("requireCourseAccess", () => {
  beforeEach(() => {
    mockGetAdminCourseById.mockReset();
    mockCanEditCoursePure.mockReset();
  });

  it("returns course when found and editable", async () => {
    mockGetAdminCourseById.mockResolvedValue({
      id: "c1",
      title: "Course",
      ownerUserId: "u1",
    });
    mockCanEditCoursePure.mockReturnValue(true);
    const result = await requireCourseAccess(fakeSession, "c1");
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.course?.title).toBe("Course");
  });

  it("returns not_found when course missing", async () => {
    mockGetAdminCourseById.mockResolvedValue(null);
    const result = await requireCourseAccess(fakeSession, "c1");
    expect(result).toEqual({ ok: false, error: "not_found" });
  });

  it("returns forbidden when not editable", async () => {
    mockGetAdminCourseById.mockResolvedValue({
      id: "c1",
      title: "Course",
      ownerUserId: "u2",
    });
    mockCanEditCoursePure.mockReturnValue(false);
    const result = await requireCourseAccess(fakeSession, "c1");
    expect(result).toEqual({ ok: false, error: "forbidden" });
  });
});

describe("revalidateCourseAdminPaths", () => {
  it("revalidates admin paths without slug", async () => {
    const { revalidatePath } = await import("next/cache");
    revalidateCourseAdminPaths("c1");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/courses");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/courses/c1");
    expect(revalidatePath).toHaveBeenCalledWith("/admin/courses/c1/curriculum");
    expect(revalidatePath).not.toHaveBeenCalledWith("/courses/test");
  });

  it("revalidates public paths with slug", async () => {
    const { revalidatePath } = await import("next/cache");
    revalidateCourseAdminPaths("c1", "test-course");
    expect(revalidatePath).toHaveBeenCalledWith("/courses/test-course");
    expect(revalidatePath).toHaveBeenCalledWith("/courses");
  });
});
