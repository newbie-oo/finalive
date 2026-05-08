import { cn } from "@/lib/utils";
import { StatusChip } from "./status-chip";

export type PriceValue = number | "free";

interface PriceTagProps {
	/** Either a Thai-baht number or the literal "free". */
	price: PriceValue;
	/** Optional original price; rendered struck through when higher than price. */
	originalPrice?: number;
	/** Visual scale. Defaults to "md". */
	size?: "sm" | "md" | "lg";
	className?: string;
}

const SIZE_CLASS: Record<NonNullable<PriceTagProps["size"]>, string> = {
	sm: "text-h4",
	md: "text-h3",
	lg: "text-h2",
};

const ORIGINAL_SIZE_CLASS: Record<NonNullable<PriceTagProps["size"]>, string> = {
	sm: "text-uism",
	md: "text-ui",
	lg: "text-bodylg",
};

const THB = (value: number): string => `฿${value.toLocaleString("en-US")}`;

/**
 * Canonical price renderer for course cards, hero buy boxes, and checkout
 * summaries. Free → success-toned chip. Numeric → bold primary number with
 * an optional struck-through original price + auto-calculated discount
 * badge. Tokens only — no raw hex, no inline styles.
 */
export function PriceTag({
	price,
	originalPrice,
	size = "md",
	className,
}: PriceTagProps) {
	if (price === "free") {
		return (
			<span className={className}>
				<StatusChip tone="success">ฟรี</StatusChip>
			</span>
		);
	}

	const showDiscount =
		typeof originalPrice === "number" && originalPrice > price;
	const discountPct = showDiscount
		? Math.round(((originalPrice - price) / originalPrice) * 100)
		: 0;

	return (
		<span className={cn("inline-flex items-baseline gap-2", className)}>
			<span className={cn("num font-bold text-primary", SIZE_CLASS[size])}>
				{THB(price)}
			</span>
			{showDiscount && (
				<>
					<span
						className={cn(
							"num text-muted-foreground line-through",
							ORIGINAL_SIZE_CLASS[size],
						)}
					>
						{THB(originalPrice)}
					</span>
					<StatusChip tone="destructive">{`-${discountPct}%`}</StatusChip>
				</>
			)}
		</span>
	);
}
