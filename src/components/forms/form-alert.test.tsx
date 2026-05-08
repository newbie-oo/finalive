import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FormAlert } from "./form-alert";

describe("FormAlert", () => {
	it("renders nothing when message is null", () => {
		const { container } = render(<FormAlert message={null} variant="destructive" />);
		expect(container.firstChild).toBeNull();
	});

	it("renders nothing when message is empty string", () => {
		const { container } = render(<FormAlert message="" variant="destructive" />);
		expect(container.firstChild).toBeNull();
	});

	it("renders the message in destructive variant", () => {
		render(<FormAlert message="something failed" variant="destructive" />);
		expect(screen.getByText("something failed")).toBeInTheDocument();
	});

	it("renders the message in success variant", () => {
		render(<FormAlert message="saved" variant="success" />);
		expect(screen.getByText("saved")).toBeInTheDocument();
	});
});
