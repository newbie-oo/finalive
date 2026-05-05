import { describe, it, expect, vi } from "vitest";
import { CourseAdminService } from "./course-admin";

vi.mock("server-only", () => ({}));

function fakeDeps() {
  return {
    createCourse: vi.fn().mockResolvedValue("course-1"),
    updateCourse: vi.fn().mockResolvedValue(undefined),
  };
}

describe("CourseAdminService", () => {
  it("normalizes price to 0.00 when isFree=true", async () => {
    const deps = fakeDeps();
    const svc = new CourseAdminService(deps);
    await svc.create({
      slug: "test",
      title: "Test",
      summary: "A test course",
      isFree: true,
      price: "990",
      ownerUserId: "u1",
    });
    expect(deps.createCourse).toHaveBeenCalledWith(
      expect.objectContaining({ price: "0.00" }),
    );
  });

  it("uses provided price when not free", async () => {
    const deps = fakeDeps();
    const svc = new CourseAdminService(deps);
    await svc.create({
      slug: "test",
      title: "Test",
      summary: "A test course",
      isFree: false,
      price: "990",
      ownerUserId: "u1",
    });
    expect(deps.createCourse).toHaveBeenCalledWith(
      expect.objectContaining({ price: "990" }),
    );
  });

  it("applies partial updates", async () => {
    const deps = fakeDeps();
    const svc = new CourseAdminService(deps);
    await svc.update("c1", { title: "New Title" });
    expect(deps.updateCourse).toHaveBeenCalledWith("c1", {
      title: "New Title",
    });
  });
});
