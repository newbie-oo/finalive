import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PasswordInput } from "./password-input";

describe("PasswordInput", () => {
  it("toggles password visibility", () => {
    render(<PasswordInput value="secret" />);
    const input = screen.getByDisplayValue("secret");
    expect(input).toHaveAttribute("type", "password");

    const btn = screen.getByRole("button", { name: /Show password/ });
    fireEvent.click(btn);

    expect(input).toHaveAttribute("type", "text");
    expect(
      screen.getByRole("button", { name: /Hide password/ }),
    ).toBeInTheDocument();
  });

  it("shows no strength bars by default", () => {
    render(<PasswordInput value="weak" />);
    expect(screen.queryByLabelText(/Password strength/)).not.toBeInTheDocument();
  });

  it("shows strength bars when showStrength is true", () => {
    render(<PasswordInput value="weak" showStrength />);
    expect(screen.getByLabelText(/Password strength/)).toBeInTheDocument();
  });

  it("1 bar for ≥8 chars only", () => {
    const { container } = render(
      <PasswordInput value="password" showStrength />,
    );
    const bars = container.querySelectorAll(".h-1");
    expect(bars[0]).toHaveClass("bg-red-500");
    expect(bars[1]).not.toHaveClass("bg-red-500");
    expect(bars[1]).not.toHaveClass("bg-orange-500");
  });

  it("2 bars for ≥8 chars + number", () => {
    const { container } = render(
      <PasswordInput value="passw0rd" showStrength />,
    );
    const bars = container.querySelectorAll(".h-1");
    expect(bars[0]).toHaveClass("bg-orange-500");
    expect(bars[1]).toHaveClass("bg-orange-500");
    expect(bars[2]).not.toHaveClass("bg-orange-500");
  });

  it("3 bars for ≥8 chars + number + symbol", () => {
    const { container } = render(
      <PasswordInput value="passw0rd!" showStrength />,
    );
    const bars = container.querySelectorAll(".h-1");
    expect(bars[0]).toHaveClass("bg-yellow-500");
    expect(bars[1]).toHaveClass("bg-yellow-500");
    expect(bars[2]).toHaveClass("bg-yellow-500");
    expect(bars[3]).not.toHaveClass("bg-yellow-500");
  });

  it("4 bars for ≥8 chars + number + symbol + mixed case", () => {
    const { container } = render(
      <PasswordInput value="Passw0rd!" showStrength />,
    );
    const bars = container.querySelectorAll(".h-1");
    expect(bars[0]).toHaveClass("bg-green-500");
    expect(bars[1]).toHaveClass("bg-green-500");
    expect(bars[2]).toHaveClass("bg-green-500");
    expect(bars[3]).toHaveClass("bg-green-500");
  });
});
