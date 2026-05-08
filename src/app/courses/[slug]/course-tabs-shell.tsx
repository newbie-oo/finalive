"use client";

import { useEffect, useRef, useState } from "react";

const TABS = [
	{ id: "curriculum", label: "เนื้อหา" },
	{ id: "instructor", label: "ผู้สอน" },
	{ id: "faq", label: "FAQ" },
] as const;

type TabId = (typeof TABS)[number]["id"];

interface CourseTabsShellProps {
	curriculumPanel: React.ReactNode;
	instructorPanel: React.ReactNode;
	faqPanel: React.ReactNode;
	sidebar: React.ReactNode;
}

export function CourseTabsShell({
	curriculumPanel,
	instructorPanel,
	faqPanel,
	sidebar,
}: CourseTabsShellProps) {
	const [activeTab, setActiveTab] = useState<TabId>(() => {
		if (
			typeof window !== "undefined" &&
			window.location.hash === "#instructor"
		) {
			return "instructor";
		}
		return "curriculum";
	});
	const sectionRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (typeof window === "undefined") return;
		if (window.location.hash === "#instructor") {
			sectionRef.current?.scrollIntoView({
				behavior: "smooth",
				block: "start",
			});
		}
	}, []);

	const panel =
		activeTab === "curriculum"
			? curriculumPanel
			: activeTab === "instructor"
				? instructorPanel
				: faqPanel;

	return (
		<section ref={sectionRef} id="instructor" className="py-12 md:py-16">
			<div className="mx-auto max-w-[1200px] px-6">
				<div className="grid gap-10 lg:grid-cols-[1.6fr_1fr] lg:gap-12">
					<div>
						<div className="mb-8 flex gap-1 border-b border-border">
							{TABS.map((tab) => (
								<button
									key={tab.id}
									type="button"
									onClick={() => setActiveTab(tab.id)}
									className={`relative px-3 pb-3 pt-1 text-ui font-medium transition-colors ${
										activeTab === tab.id
											? "text-foreground"
											: "text-muted-foreground hover:text-foreground"
									}`}
									aria-selected={activeTab === tab.id}
									role="tab"
								>
									{tab.label}
									{activeTab === tab.id && (
										<span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />
									)}
								</button>
							))}
						</div>
						{panel}
					</div>
					<div>{sidebar}</div>
				</div>
			</div>
		</section>
	);
}
