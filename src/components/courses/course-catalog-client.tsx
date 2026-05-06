"use client";

import { useState } from "react";
import { ViewModeToggle } from "./view-mode-toggle";

interface CourseCatalogClientProps {
	resultsBar: React.ReactNode;
	childrenGrid: React.ReactNode;
	childrenList: React.ReactNode;
	pagination: React.ReactNode;
}

export function CourseCatalogClient({
	resultsBar,
	childrenGrid,
	childrenList,
	pagination,
}: CourseCatalogClientProps) {
	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

	return (
		<>
			<div className="mb-5 flex items-center justify-between">
				{resultsBar}
				<ViewModeToggle value={viewMode} onChange={setViewMode} />
			</div>

			{viewMode === "grid" ? childrenGrid : childrenList}

			<div className="mt-10">{pagination}</div>
		</>
	);
}
