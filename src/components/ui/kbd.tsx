import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface KbdProps extends HTMLAttributes<HTMLElement> {
	children: ReactNode;
}

/**
 * Single keyboard key chip. Tokenised mono+border styling so every kbd in
 * the product reads the same. Use Kbd for one key; KbdShortcut for combos.
 */
export function Kbd({ children, className, ...props }: KbdProps) {
	return (
		<kbd
			className={cn(
				"mono inline-flex h-6 min-w-[24px] items-center justify-center rounded border border-border bg-muted px-1.5 text-uism text-foreground",
				className,
			)}
			{...props}
		>
			{children}
		</kbd>
	);
}

interface KbdShortcutProps {
	/** Key labels in display order. Empty array renders nothing. */
	keys: ReadonlyArray<string>;
	/** Glue rendered between adjacent keys. Defaults to "+". */
	separator?: string;
	className?: string;
}

/**
 * Multi-key shortcut chip group, e.g. <KbdShortcut keys={["Ctrl", "K"]} />.
 * Each key is a <Kbd>; separators sit between them as muted text.
 */
export function KbdShortcut({
	keys,
	separator = "+",
	className,
}: KbdShortcutProps) {
	if (keys.length === 0) return null;
	return (
		<span className={cn("inline-flex items-center gap-1", className)}>
			{keys.map((key, idx) => (
				<span key={idx} className="inline-flex items-center gap-1">
					{idx > 0 && (
						<span className="text-uism text-muted-foreground">{separator}</span>
					)}
					<Kbd>{key}</Kbd>
				</span>
			))}
		</span>
	);
}
