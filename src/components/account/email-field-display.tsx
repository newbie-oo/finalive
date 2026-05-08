"use client";

import { useState } from "react";
import { Copy, Check } from "@phosphor-icons/react";

import { Button } from "@/components/ui/button";

interface EmailFieldDisplayProps {
	email: string;
}

/**
 * Read-only email row rendered as a pill instead of a disabled `<input>`
 * — disabled inputs read as "broken control" to most users; a pill with
 * a copy button reads as "this is a value, here's the action you'd want
 * with it". The brief's "field-display row" pattern.
 */
export function EmailFieldDisplay({ email }: EmailFieldDisplayProps) {
	const [copied, setCopied] = useState(false);

	async function handleCopy() {
		try {
			await navigator.clipboard.writeText(email);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 1800);
		} catch {
			// Clipboard access can be denied (insecure context, permission). Fail
			// silently — the email itself is still on screen for manual copy.
		}
	}

	return (
		<div className="flex items-center justify-between gap-3 rounded-input border border-border bg-muted px-3 py-2">
			<span className="min-w-0 truncate text-body text-foreground">
				{email}
			</span>
			<Button
				type="button"
				variant="ghost"
				size="sm"
				onClick={handleCopy}
			>
				{copied ? (
					<>
						<Check size={14} weight="bold" /> คัดลอกแล้ว
					</>
				) : (
					<>
						<Copy size={14} weight="bold" /> คัดลอก
					</>
				)}
			</Button>
		</div>
	);
}
