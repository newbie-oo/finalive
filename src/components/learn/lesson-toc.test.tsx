import { describe, it, expect, afterEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { LessonToc } from "./lesson-toc";

let attached: HTMLElement | null = null;

function setupArticle(html: string) {
	const wrapper = document.createElement("div");
	wrapper.innerHTML = `<article class="prose-style">${html}</article>`;
	document.body.appendChild(wrapper);
	attached = wrapper;
}

afterEach(() => {
	if (attached) {
		document.body.removeChild(attached);
		attached = null;
	}
});

describe("LessonToc", () => {
	it("renders one entry per heading found in the article", async () => {
		setupArticle(
			`<h2>หัวข้อแรก</h2><p>x</p><h3>หัวข้อย่อย</h3><h2>หัวข้อสอง</h2>`,
		);
		render(<LessonToc lessonId="l1" />);
		const nav = await screen.findByRole("navigation");
		await waitFor(() => {
			expect(within(nav).getByText("หัวข้อแรก")).toBeInTheDocument();
			expect(within(nav).getByText("หัวข้อย่อย")).toBeInTheDocument();
			expect(within(nav).getByText("หัวข้อสอง")).toBeInTheDocument();
		});
	});

	it("returns nothing when the article has no h2/h3", async () => {
		setupArticle(`<p>plain text</p>`);
		const { container } = render(<LessonToc lessonId="empty" />);
		await waitFor(() => {
			expect(container.firstChild).toBeNull();
		});
	});

	it("slugifies headings into clickable in-page anchors", async () => {
		setupArticle(`<h2>Hello World</h2>`);
		render(<LessonToc lessonId="l2" />);
		const nav = await screen.findByRole("navigation");
		const link = within(nav).getByRole("link", { name: "Hello World" });
		expect(link.getAttribute("href")).toBe("#hello-world");
	});
});
