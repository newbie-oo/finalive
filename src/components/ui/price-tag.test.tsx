import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PriceTag } from "./price-tag";

describe("PriceTag", () => {
	it("renders 'ฟรี' when the price is the literal 'free'", () => {
		render(<PriceTag price="free" />);
		expect(screen.getByText(/ฟรี/)).toBeInTheDocument();
	});

	it("formats numeric THB prices with thousands separators and a baht prefix", () => {
		render(<PriceTag price={1290} />);
		expect(screen.getByText("฿1,290")).toBeInTheDocument();
	});

	it("renders the original price struck through when provided alongside a discount", () => {
		render(<PriceTag price={1990} originalPrice={2990} />);
		expect(screen.getByText("฿2,990")).toHaveClass("line-through");
	});

	it("computes and displays the discount badge when an originalPrice is higher", () => {
		render(<PriceTag price={1990} originalPrice={2990} />);
		// (2990 - 1990) / 2990 ≈ 33%
		expect(screen.getByText(/-33%/)).toBeInTheDocument();
	});

	it("hides the discount badge when originalPrice is not higher than price", () => {
		render(<PriceTag price={1990} originalPrice={1990} />);
		expect(screen.queryByText(/%/)).toBeNull();
	});
});
