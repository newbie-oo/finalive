import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { PRICE_OPTIONS, SORT_OPTIONS } from "./course-filter-options";

interface CourseFilterPanelsProps {
	categories: ReadonlyArray<{
		readonly label: string;
		readonly count: number;
	}>;
	price: string;
	freeOnly: boolean;
	sortBy: string;
	onPriceChange: (v: string) => void;
	onSortChange: (v: string) => void;
}

/** Filter form bodies, shared between the desktop sidebar and the mobile
 * Sheet. Stateless — caller owns the values + setters. */
export function CourseFilterPanels({
	categories,
	price,
	freeOnly,
	sortBy,
	onPriceChange,
	onSortChange,
}: CourseFilterPanelsProps) {
	return (
		<>
			<div className="rounded-card border border-border bg-card p-4">
				<h3 className="mb-3 text-uism font-semibold text-foreground">
					หมวดหมู่
				</h3>
				<ul className="space-y-2.5">
					{categories.map((cat) => (
						<li key={cat.label}>
							<Label
								htmlFor={`cat-${cat.label}`}
								className="flex cursor-pointer items-center gap-2.5 text-ui font-normal text-muted-foreground transition-colors hover:text-foreground"
							>
								<Checkbox id={`cat-${cat.label}`} />
								<span className="flex-1">{cat.label}</span>
								<span className="num text-caption text-foreground-subtle">
									({cat.count})
								</span>
							</Label>
						</li>
					))}
				</ul>
			</div>

			<div className="rounded-card border border-border bg-card p-4">
				<h3 className="mb-3 text-uism font-semibold text-foreground">ราคา</h3>
				<RadioGroup
					value={price === "" && freeOnly ? "free" : price}
					onValueChange={onPriceChange}
					className="gap-2.5"
				>
					{PRICE_OPTIONS.map((o) => (
						<Label
							key={o.value || "all"}
							htmlFor={`price-${o.value || "all"}`}
							className="flex cursor-pointer items-center gap-2.5 text-ui font-normal text-muted-foreground transition-colors hover:text-foreground"
						>
							<RadioGroupItem
								id={`price-${o.value || "all"}`}
								value={o.value}
							/>
							<span>{o.label}</span>
						</Label>
					))}
				</RadioGroup>
			</div>

			<div className="rounded-card border border-border bg-card p-4">
				<h3 className="mb-3 text-uism font-semibold text-foreground">
					เรียงลำดับ
				</h3>
				<Select value={sortBy} onValueChange={onSortChange}>
					<SelectTrigger aria-label="Sort" className="w-full">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						{SORT_OPTIONS.map((o) => (
							<SelectItem key={o.value} value={o.value}>
								{o.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>
		</>
	);
}
