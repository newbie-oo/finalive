import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Accordion, AccordionItem } from "./accordion";

describe("Accordion", () => {
  it("renders items with header text", () => {
    render(
      <Accordion>
        <AccordionItem header="Item 1">Content 1</AccordionItem>
        <AccordionItem header="Item 2">Content 2</AccordionItem>
      </Accordion>,
    );
    expect(screen.getByText("Item 1")).toBeInTheDocument();
    expect(screen.getByText("Item 2")).toBeInTheDocument();
  });

  it("toggles open/close on click", () => {
    render(
      <Accordion>
        <AccordionItem header="Item 1">Content 1</AccordionItem>
      </Accordion>,
    );

    const btn = screen.getByRole("button", { name: "Item 1" });
    // Initially closed, content should be hidden (max-height: 0px)
    expect(btn).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(btn);
    expect(btn).toHaveAttribute("aria-expanded", "false");
  });

  it("has animation class on content wrapper", () => {
    const { container } = render(
      <Accordion>
        <AccordionItem header="Item 1">Content 1</AccordionItem>
      </Accordion>,
    );

    const wrapper = container.querySelector(".transition-\\[max-height\\]");
    expect(wrapper).toBeInTheDocument();
    expect(wrapper).toHaveClass("duration-300");
  });

  it("allows multiple items open simultaneously", () => {
    render(
      <Accordion>
        <AccordionItem header="Item 1">Content 1</AccordionItem>
        <AccordionItem header="Item 2">Content 2</AccordionItem>
      </Accordion>,
    );

    const btn1 = screen.getByRole("button", { name: "Item 1" });
    const btn2 = screen.getByRole("button", { name: "Item 2" });

    fireEvent.click(btn1);
    fireEvent.click(btn2);

    expect(btn1).toHaveAttribute("aria-expanded", "true");
    expect(btn2).toHaveAttribute("aria-expanded", "true");
  });

  it("opens by default when defaultOpen is true", () => {
    render(
      <Accordion>
        <AccordionItem header="Item 1" defaultOpen>
          Content 1
        </AccordionItem>
      </Accordion>,
    );

    const btn = screen.getByRole("button", { name: "Item 1" });
    expect(btn).toHaveAttribute("aria-expanded", "true");
  });

  it("rotates caret icon when open", () => {
    render(
      <Accordion>
        <AccordionItem header="Item 1">Content 1</AccordionItem>
      </Accordion>,
    );

    const btn = screen.getByRole("button", { name: "Item 1" });
    const caret = btn.querySelector("svg");

    // Initially not rotated
    expect(caret).not.toHaveClass("rotate-180");

    fireEvent.click(btn);
    expect(caret).toHaveClass("rotate-180");
  });
});
