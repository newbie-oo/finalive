import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { UpNextList } from "./up-next-list";

vi.mock("next/image", () => ({
	default: ({ alt }: { alt: string }) => <span data-testid="img" aria-label={alt} />,
}));

import { vi } from "vitest";

const ITEMS = [
	{
		courseSlug: "money-101",
		courseTitle: "การเงิน 101",
		coverStorageKey: "covers/x.jpg",
		coverImageUrl: "/covers/x.jpg",
		lessonId: "l-1",
		lessonTitle: "บทแรก",
		durationSeconds: 600,
	},
	{
		courseSlug: "stocks-201",
		courseTitle: "หุ้น 201",
		coverStorageKey: null,
		coverImageUrl: null,
		lessonId: "l-2",
		lessonTitle: "วิเคราะห์งบ",
		durationSeconds: null,
	},
];

describe("UpNextList", () => {
	it("returns null when no items", () => {
		const { container } = render(<UpNextList items={[]} />);
		expect(container.firstChild).toBeNull();
	});

	it("renders one row per item with course + lesson title", () => {
		render(<UpNextList items={ITEMS} />);
		expect(screen.getByText("การเงิน 101")).toBeInTheDocument();
		expect(screen.getByText("บทแรก")).toBeInTheDocument();
		expect(screen.getByText("หุ้น 201")).toBeInTheDocument();
		expect(screen.getByText("วิเคราะห์งบ")).toBeInTheDocument();
	});

	it("links each row to the lesson deeplink", () => {
		render(<UpNextList items={ITEMS} />);
		const link = screen.getByRole("link", {
			name: /เริ่มเรียน.*การเงิน 101/,
		});
		expect(link).toHaveAttribute("href", "/learn/money-101/l-1");
	});
});
