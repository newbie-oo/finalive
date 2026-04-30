import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
	Card,
	CardHeader,
	CardTitle,
	CardDescription,
	CardContent,
	CardFooter,
} from "./card";

describe("Card", () => {
	it("renders with default padding", () => {
		render(<Card>Content</Card>);
		const card = screen.getByText("Content").closest("[data-slot='card']");
		expect(card).toBeInTheDocument();
		expect(card).toHaveClass("p-6");
	});

	it("removes padding when noPadding is true", () => {
		render(<Card noPadding>Content</Card>);
		const card = screen.getByText("Content").closest("[data-slot='card']");
		expect(card).not.toHaveClass("p-6");
	});

	it("adds interactive styles when interactive is true", () => {
		render(<Card interactive>Content</Card>);
		const card = screen.getByText("Content").closest("[data-slot='card']");
		expect(card).toHaveClass("hover:-translate-y-0.5");
		expect(card).toHaveClass("shadow-(--shadow-sm)");
	});

	it("renders CardHeader", () => {
		render(<CardHeader>Header</CardHeader>);
		expect(screen.getByText("Header")).toBeInTheDocument();
	});

	it("renders CardTitle", () => {
		render(<CardTitle>Title</CardTitle>);
		expect(screen.getByRole("heading", { name: "Title" })).toBeInTheDocument();
	});

	it("renders CardDescription", () => {
		render(<CardDescription>Desc</CardDescription>);
		expect(screen.getByText("Desc")).toBeInTheDocument();
	});

	it("renders CardContent", () => {
		render(<CardContent>Content</CardContent>);
		expect(screen.getByText("Content")).toBeInTheDocument();
	});

	it("renders CardFooter", () => {
		render(<CardFooter>Footer</CardFooter>);
		expect(screen.getByText("Footer")).toBeInTheDocument();
	});
});
