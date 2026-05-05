import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { QuizCelebration } from "./quiz-celebration";

describe("QuizCelebration", () => {
  it("renders celebration message when passed", () => {
    render(<QuizCelebration passed={true} />);
    expect(screen.getByText(/ยินดีด้วย/)).toBeInTheDocument();
  });

  it("renders encouragement when failed", () => {
    render(<QuizCelebration passed={false} />);
    expect(screen.getByText(/สู้ๆ/)).toBeInTheDocument();
  });
});
