"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

interface TocItem {
	id: string;
	text: string;
	level: 2 | 3;
}

interface LessonTocProps {
	/** Cache key — rerun the heading scan when the lesson changes. */
	lessonId: string;
	/** CSS selector for the article element to scan. Defaults to the
	 * lesson body's `<article>`. */
	articleSelector?: string;
}

/**
 * Client-only table of contents for the lesson body. Walks the article's
 * h2/h3 elements after mount, slugifies any missing ids, and renders a
 * sticky list of in-page anchors. Returns null if no h2/h3 exist so
 * short lessons don't get a stub TOC.
 */
export function LessonToc({
	lessonId,
	articleSelector = "article.prose-style",
}: LessonTocProps) {
	const [items, setItems] = useState<TocItem[]>([]);
	const [activeId, setActiveId] = useState<string | null>(null);

	useEffect(() => {
		const article = document.querySelector(articleSelector);
		if (!(article instanceof HTMLElement)) {
			setItems([]);
			return;
		}

		const headings = Array.from(
			article.querySelectorAll<HTMLElement>("h2, h3"),
		);
		const used = new Set<string>();
		const collected: TocItem[] = [];

		for (const h of headings) {
			const text = h.textContent?.trim() ?? "";
			if (!text) continue;
			let id = h.id || slugify(text);
			let suffix = 1;
			while (used.has(id)) {
				suffix += 1;
				id = `${slugify(text)}-${suffix}`;
			}
			used.add(id);
			if (h.id !== id) h.id = id;
			h.style.scrollMarginTop = "5rem"; // clear sticky topbar on jump
			collected.push({
				id,
				text,
				level: h.tagName === "H3" ? 3 : 2,
			});
		}

		setItems(collected);

		if (collected.length === 0) return;
		if (typeof IntersectionObserver === "undefined") return;

		const observer = new IntersectionObserver(
			(entries) => {
				const visible = entries
					.filter((e) => e.isIntersecting)
					.sort(
						(a, b) =>
							a.boundingClientRect.top - b.boundingClientRect.top,
					)[0];
				if (visible?.target.id) setActiveId(visible.target.id);
			},
			{ rootMargin: "-30% 0px -60% 0px", threshold: 0 },
		);
		for (const h of headings) observer.observe(h);
		return () => observer.disconnect();
	}, [lessonId, articleSelector]);

	if (items.length === 0) return null;

	return (
		<nav
			aria-label="สารบัญบทเรียน"
			className="hidden xl:block sticky top-24 max-h-[calc(100dvh-7rem)] overflow-y-auto"
		>
			<div className="text-uism font-semibold uppercase tracking-widest text-foreground-subtle">
				สารบัญ
			</div>
			<ul className="mt-3 space-y-1.5 border-l border-border pl-3">
				{items.map((item) => (
					<li key={item.id}>
						<a
							href={`#${item.id}`}
							className={cn(
								"block truncate rounded px-2 py-1 text-uism transition-colors hover:text-foreground",
								item.level === 3 && "pl-5 text-caption",
								activeId === item.id
									? "font-semibold text-primary"
									: "text-muted-foreground",
							)}
						>
							{item.text}
						</a>
					</li>
				))}
			</ul>
		</nav>
	);
}

function slugify(text: string): string {
	return text
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[̀-ͯ]/g, "")
		.replace(/[^\p{L}\p{N}\s-]/gu, "")
		.trim()
		.replace(/\s+/g, "-")
		.slice(0, 64) || "section";
}
