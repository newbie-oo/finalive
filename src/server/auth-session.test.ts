import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));

const redirectMock = vi.fn((url: string) => {
  throw new Error(`__redirect:${url}`);
});

vi.mock("next/navigation", () => ({ redirect: redirectMock }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const getSessionApi = vi.fn();
vi.mock("./auth", () => ({
  auth: { api: { getSession: getSessionApi } },
}));

beforeEach(() => {
  redirectMock.mockClear();
  getSessionApi.mockReset();
});

describe("auth-session", () => {
  it("getSession returns null when no user", async () => {
    getSessionApi.mockResolvedValue(null);
    const { getSession } = await import("./auth-session");
    expect(await getSession()).toBeNull();
  });

  it("requireSession redirects to /login when missing", async () => {
    getSessionApi.mockResolvedValue(null);
    const { requireSession } = await import("./auth-session");
    await expect(requireSession()).rejects.toThrow("__redirect:/login");
    expect(redirectMock).toHaveBeenCalledWith("/login");
  });

  it("requireRole('admin') redirects to /403 when role mismatches", async () => {
    getSessionApi.mockResolvedValue({
      session: { id: "s1" },
      user: { id: "u1", email: "x@y", name: "X", role: "user", emailVerified: true },
    });
    const { requireRole } = await import("./auth-session");
    await expect(requireRole("admin")).rejects.toThrow("__redirect:/403");
  });

  it("requireRole('admin') passes for admin user", async () => {
    getSessionApi.mockResolvedValue({
      session: { id: "s2" },
      user: { id: "u2", email: "a@b", name: "A", role: "admin", emailVerified: true },
    });
    const { requireRole } = await import("./auth-session");
    const ctx = await requireRole("admin");
    expect(ctx.user.role).toBe("admin");
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
