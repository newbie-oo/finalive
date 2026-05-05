import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { RefCodeCopy } from "./ref-code-copy";

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("RefCodeCopy", () => {
  const originalClipboard = global.navigator.clipboard;

  beforeEach(() => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(global.navigator, "clipboard", {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    Object.defineProperty(global.navigator, "clipboard", {
      value: originalClipboard,
      writable: true,
      configurable: true,
    });
    vi.useRealTimers();
  });

  it("renders the ref code", () => {
    render(<RefCodeCopy refCode="REF123" />);
    expect(screen.getByText("REF123")).toBeInTheDocument();
  });

  it("copies ref code to clipboard on click", async () => {
    const { toast } = await import("sonner");
    render(<RefCodeCopy refCode="REF123" />);

    const btn = screen.getByRole("button", { name: /คัดลอกเลขอ้างอิง/ });
    await act(async () => {
      fireEvent.click(btn);
      await Promise.resolve();
    });

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("REF123");
    expect(toast.success).toHaveBeenCalledWith("คัดลอกเลขอ้างอิงแล้ว");
  });

  it("shows check icon briefly after click", async () => {
    render(<RefCodeCopy refCode="REF123" />);

    const btn = screen.getByRole("button", { name: /คัดลอกเลขอ้างอิง/ });
    await act(async () => {
      fireEvent.click(btn);
      await Promise.resolve();
    });

    // After click, the Check icon should be present (indicated by text-success class)
    expect(btn.querySelector("[class*='text-success']")).toBeInTheDocument();

    // After 2 seconds, it should revert
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(
      btn.querySelector("[class*='text-(--foreground-subtle)']"),
    ).toBeInTheDocument();
  });

  it("shows error toast when clipboard fails", async () => {
    const { toast } = await import("sonner");
    const mockWriteText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(global.navigator, "clipboard", {
      value: { writeText: mockWriteText },
      writable: true,
      configurable: true,
    });

    render(<RefCodeCopy refCode="REF123" />);

    const btn = screen.getByRole("button", { name: /คัดลอกเลขอ้างอิง/ });
    await act(async () => {
      fireEvent.click(btn);
      await Promise.resolve();
    });

    expect(toast.error).toHaveBeenCalledWith("คัดลอกไม่สำเร็จ");
  });
});
