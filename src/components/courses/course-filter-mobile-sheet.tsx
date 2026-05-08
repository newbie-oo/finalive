import { Faders } from "@phosphor-icons/react";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { CourseFilterPanels } from "./course-filter-panels";
import { CATEGORIES } from "./course-filter-options";

interface CourseFilterMobileSheetProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	hasFilters: boolean;
	onClearAll: () => void;
	price: string;
	freeOnly: boolean;
	sortBy: string;
	onPriceChange: (v: string) => void;
	onSortChange: (v: string) => void;
}

/** Floating bottom button + Sheet — mobile-only filter rail. Hidden on md+
 * where the desktop sticky aside is shown. */
export function CourseFilterMobileSheet({
	open,
	onOpenChange,
	hasFilters,
	onClearAll,
	price,
	freeOnly,
	sortBy,
	onPriceChange,
	onSortChange,
}: CourseFilterMobileSheetProps) {
	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetTrigger asChild>
				<button
					type="button"
					className="fixed inset-x-4 bottom-4 z-30 inline-flex items-center justify-center gap-2 rounded-full bg-primary py-3 text-ui font-semibold text-primary-foreground shadow-(--shadow-lg) transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary md:hidden"
				>
					<Faders size={16} weight="bold" />
					ตัวกรอง
					{hasFilters && (
						<span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-foreground/20 px-1.5 text-caption font-bold">
							•
						</span>
					)}
				</button>
			</SheetTrigger>
			<SheetContent
				side="bottom"
				className="max-h-[85vh] gap-0 rounded-t-card p-0"
			>
				<SheetHeader className="border-b border-border px-5 py-4">
					<SheetTitle>ตัวกรองคอร์ส</SheetTitle>
					<SheetDescription className="sr-only">
						เลือกหมวดหมู่ ราคา และการเรียงลำดับเพื่อกรองคอร์ส
					</SheetDescription>
				</SheetHeader>
				<div className="flex-1 space-y-6 overflow-y-auto p-5">
					<CourseFilterPanels
						categories={CATEGORIES}
						price={price}
						freeOnly={freeOnly}
						sortBy={sortBy}
						onPriceChange={onPriceChange}
						onSortChange={onSortChange}
					/>
				</div>
				<SheetFooter className="flex-row gap-3 border-t border-border bg-background px-5 py-4">
					{hasFilters && (
						<Button
							type="button"
							variant="ghost"
							size="md"
							onClick={onClearAll}
							className="flex-1"
						>
							ล้างทั้งหมด
						</Button>
					)}
					<Button
						type="button"
						variant="primary"
						size="md"
						onClick={() => onOpenChange(false)}
						className="flex-[1.5]"
					>
						ดูคอร์ส
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}
