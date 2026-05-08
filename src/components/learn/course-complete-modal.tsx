"use client";

import { useEffect, useState } from "react";
import { X } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { CertificateClaim } from "./certificate-claim";

interface CourseCompleteModalProps {
	courseSlug: string;
	/** Total lessons in the course. Modal only fires when reached. */
	totalLessons: number;
	doneLessons: number;
}

const STORAGE_PREFIX = "finalive:cert-shown:";

function readShown(courseSlug: string): boolean {
	if (typeof window === "undefined") return true; // SSR: never auto-open.
	return !!window.localStorage.getItem(`${STORAGE_PREFIX}${courseSlug}`);
}

/**
 * One-shot celebratory dialog when the student first hits 100%. Derives
 * openness from a lazy-initialised localStorage read (so we never call
 * setState inside an effect to "decide" whether to open) plus a local
 * "dismissed" flag the user toggles via the close button or Escape.
 */
export function CourseCompleteModal({
	courseSlug,
	totalLessons,
	doneLessons,
}: CourseCompleteModalProps) {
	// Lazy initialiser reads localStorage once on mount; subsequent renders
	// are pure props/state derivations. SSR-safe via the readShown guard.
	const [dismissed, setDismissed] = useState<boolean>(() =>
		readShown(courseSlug),
	);

	const completed = totalLessons > 0 && doneLessons >= totalLessons;
	const open = completed && !dismissed;

	// Persist the shown flag the first time the modal becomes visible. Side
	// effect, not state — safe to do in useEffect without violating the
	// set-state-in-effect lint rule.
	useEffect(() => {
		if (!open) return;
		if (typeof window === "undefined") return;
		window.localStorage.setItem(
			`${STORAGE_PREFIX}${courseSlug}`,
			String(Date.now()),
		);
	}, [open, courseSlug]);

	// Close on Escape for accessibility.
	useEffect(() => {
		if (!open) return;
		const handler = (e: KeyboardEvent) => {
			if (e.key === "Escape") setDismissed(true);
		};
		window.addEventListener("keydown", handler);
		return () => window.removeEventListener("keydown", handler);
	}, [open]);

	if (!open) return null;
	const setOpen = (next: boolean) => setDismissed(!next);

	return (
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="course-complete-title"
			className="fixed inset-0 z-[100] flex items-center justify-center px-4"
		>
			<button
				type="button"
				aria-label="ปิด"
				className="absolute inset-0 bg-black/50 backdrop-blur-sm"
				onClick={() => setOpen(false)}
			/>
			<div className="relative z-10 w-full max-w-md rounded-card border border-border bg-card p-6 shadow-xl">
				<button
					type="button"
					aria-label="ปิด"
					onClick={() => setOpen(false)}
					className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
				>
					<X size={16} />
				</button>
				<CertificateClaim variant="modal" />
				<div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-end">
					<Button
						type="button"
						variant="ghost"
						size="md"
						onClick={() => setOpen(false)}
					>
						ปิด
					</Button>
				</div>
			</div>
		</div>
	);
}
