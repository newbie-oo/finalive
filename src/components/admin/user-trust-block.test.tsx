import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { UserTrustBlock } from "./user-trust-block";

describe("UserTrustBlock", () => {
	it("returns null when no signals are provided so it doesn't render an empty header", () => {
		const { container } = render(<UserTrustBlock signals={{}} />);
		expect(container.firstChild).toBeNull();
	});

	it("renders an account-age chip with months when accountCreatedAt is set", () => {
		const sevenMonthsAgo = new Date();
		sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);
		render(
			<UserTrustBlock signals={{ accountCreatedAt: sevenMonthsAgo }} />,
		);
		expect(screen.getByText(/สมัคร\s*7\s*เดือน/)).toBeInTheDocument();
	});

	it("renders successful-payments chip with count", () => {
		render(<UserTrustBlock signals={{ successfulPaymentCount: 4 }} />);
		expect(screen.getByText(/ชำระสำเร็จ\s*4\s*ครั้ง/)).toBeInTheDocument();
	});

	it("flags accounts with prior rejections in destructive tone", () => {
		const { container } = render(
			<UserTrustBlock signals={{ previouslyRejectedCount: 2 }} />,
		);
		const chip = screen.getByText(/เคยถูกปฏิเสธ\s*2\s*ครั้ง/);
		expect(chip).toBeInTheDocument();
		// Destructive tone — assert the chip carries the destructive token
		// somewhere in its className chain.
		const node = container.querySelector('[data-tone="destructive"]');
		expect(node).not.toBeNull();
	});

	it("shows a positive 'no prior rejections' chip when explicitly zero", () => {
		render(<UserTrustBlock signals={{ previouslyRejectedCount: 0 }} />);
		expect(screen.getByText(/ไม่เคยถูกปฏิเสธ/)).toBeInTheDocument();
	});
});
