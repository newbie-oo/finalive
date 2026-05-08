"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { Copy, Check } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ReferenceCodeBlockProps {
	/** The reference code value to display and copy. */
	value: string;
	/** Eyebrow label above the code. Defaults to "เลขอ้างอิง". */
	label?: string;
	/** Helper line shown beneath the label, in muted text. */
	helper?: string;
}

const RESET_MS = 2000;

/**
 * The most-copied element in the product. Renders the reference code as a
 * large dashed block with a one-tap copy button. After a successful copy,
 * the border briefly flashes success-coloured and the button label flips to
 * a confirmation state.
 */
export function ReferenceCodeBlock({
	value,
	label = "เลขอ้างอิง",
	helper,
}: ReferenceCodeBlockProps) {
	const [copied, setCopied] = useState(false);

	const handleCopy = useCallback(async () => {
		try {
			await navigator.clipboard.writeText(value);
			toast.success("คัดลอกเลขอ้างอิงแล้ว");
			setCopied(true);
			setTimeout(() => setCopied(false), RESET_MS);
		} catch {
			toast.error("คัดลอกไม่สำเร็จ");
		}
	}, [value]);

	return (
		<Card
			role="group"
			aria-label={label}
			className={`border-2 border-dashed bg-muted text-center transition-colors ${
				copied ? "border-success" : "border-border-strong"
			}`}
		>
			<div className="text-uism font-semibold tracking-[0.08em] text-muted-foreground uppercase">
				{label}
			</div>
			{helper && (
				<p className="mt-1 text-caption text-muted-foreground">{helper}</p>
			)}
			<div className="num mono mt-3 text-h1 font-bold tracking-wider text-primary">
				{value}
			</div>
			<Button
				type="button"
				onClick={handleCopy}
				variant="primary"
				size="sm"
				className="mt-4"
				aria-label={copied ? "คัดลอกแล้ว" : "คัดลอก"}
			>
				{copied ? (
					<>
						<Check size={14} weight="bold" /> คัดลอกแล้ว
					</>
				) : (
					<>
						<Copy size={14} /> คัดลอก
					</>
				)}
			</Button>
		</Card>
	);
}
