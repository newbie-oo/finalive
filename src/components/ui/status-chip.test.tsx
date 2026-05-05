import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusChip } from "./status-chip";

describe("StatusChip", () => {
  it("renders neutral tone by default", () => {
    render(<StatusChip>Default</StatusChip>);
    const chip = screen.getByText("Default");
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveAttribute("data-slot", "status-chip");
  });

  it("renders primary tone", () => {
    render(<StatusChip tone="primary">Primary</StatusChip>);
    const chip = screen.getByText("Primary");
    expect(chip).toBeInTheDocument();
  });

  it("renders success tone", () => {
    render(<StatusChip tone="success">Success</StatusChip>);
    expect(screen.getByText("Success")).toBeInTheDocument();
  });

  it("renders warning tone", () => {
    render(<StatusChip tone="warning">Warning</StatusChip>);
    expect(screen.getByText("Warning")).toBeInTheDocument();
  });

  it("renders destructive tone", () => {
    render(<StatusChip tone="destructive">Destructive</StatusChip>);
    expect(screen.getByText("Destructive")).toBeInTheDocument();
  });

  it("renders info tone", () => {
    render(<StatusChip tone="info">Info</StatusChip>);
    expect(screen.getByText("Info")).toBeInTheDocument();
  });

  it("renders review tone", () => {
    render(<StatusChip tone="review">Review</StatusChip>);
    expect(screen.getByText("Review")).toBeInTheDocument();
  });
});
