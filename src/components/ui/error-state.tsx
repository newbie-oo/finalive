import type { ReactNode } from "react";
import Link from "next/link";
import { WarningOctagon } from "@phosphor-icons/react/dist/ssr";
import { Button } from "./button";

interface ErrorStateProps {
	/** Headline copy. Defaults to a generic Thai error message. */
	title?: string;
	/** Body copy. Defaults to a friendly retry prompt. */
	body?: string;
	/** Optional support-reference id rendered in monospace. */
	errorId?: string;
	/** When provided, renders a primary "ลองใหม่" button that calls back. */
	onRetry?: () => void;
	/** When provided, renders a secondary link to the chosen route. */
	homeHref?: string;
	/** Custom icon override (defaults to a destructive WarningOctagon). */
	icon?: ReactNode;
}

const DEFAULT_TITLE = "เกิดข้อผิดพลาด";
const DEFAULT_BODY = "ไม่สามารถโหลดหน้าได้ กรุณาลองใหม่อีกครั้ง";

/**
 * Generic "something went wrong" surface used as a fallback in error
 * boundaries, failed list fetches, and broken sub-pages. Pair with
 * EmptyState (no-data) and Skeleton (loading) to cover the 3-state pattern.
 */
export function ErrorState({
	title = DEFAULT_TITLE,
	body = DEFAULT_BODY,
	errorId,
	onRetry,
	homeHref,
	icon,
}: ErrorStateProps) {
	return (
		<div
			role="alert"
			aria-live="polite"
			className="flex flex-col items-center justify-center rounded-card border border-dashed border-destructive/40 bg-destructive-bg/30 px-6 py-12 text-center"
		>
			<div
				aria-hidden="true"
				className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-destructive-bg text-destructive"
			>
				{icon ?? <WarningOctagon size={32} weight="fill" />}
			</div>
			<p className="text-h3 text-foreground">{title}</p>
			<p className="mt-1.5 max-w-sm text-body text-muted-foreground">{body}</p>
			{errorId && (
				<p className="mono mt-3 text-caption text-foreground-subtle">
					{errorId}
				</p>
			)}
			{(onRetry || homeHref) && (
				<div className="mt-6 flex flex-wrap items-center justify-center gap-3">
					{onRetry && (
						<Button onClick={onRetry} variant="primary" size="md">
							ลองใหม่
						</Button>
					)}
					{homeHref && (
						<Button asChild variant="secondary" size="md">
							<Link href={homeHref}>กลับหน้าหลัก</Link>
						</Button>
					)}
				</div>
			)}
		</div>
	);
}
