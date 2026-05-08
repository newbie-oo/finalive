import Link from "next/link";
import {
	ArrowRight,
	Books,
	CurrencyCircleDollar,
	GraduationCap,
} from "@phosphor-icons/react/dist/ssr";

const STEPS = [
	{ icon: Books, label: "เลือกคอร์ส", body: "ดูตัวอย่างฟรีก่อนตัดสินใจ" },
	{
		icon: CurrencyCircleDollar,
		label: "ชำระเงิน",
		body: "โอนผ่านธนาคาร — ตรวจภายใน 1–2 ชม.",
	},
	{
		icon: GraduationCap,
		label: "เริ่มเรียน",
		body: "เรียนได้ทุกอุปกรณ์ จบรับใบประกาศ",
	},
] as const;

interface WelcomeHeroProps {
	/** Student's first name (or null if unset). */
	firstName: string | null;
}

/**
 * First-time-student dashboard hero. Replaces the bare "เริ่มเรียนคอร์ส
 * ใหม่ได้เลย" line with a proper onboarding panel: warm greeting, single
 * primary CTA into the catalog, and a 3-step preview of the buy → learn →
 * certify flow so new users know what to expect.
 */
export function WelcomeHero({ firstName }: WelcomeHeroProps) {
	const greeting = firstName
		? `ยินดีต้อนรับ ${firstName}! 👋`
		: "ยินดีต้อนรับ! 👋";

	return (
		<div className="overflow-hidden rounded-card border border-border bg-linear-to-br from-primary/6 to-accent/4 p-6 md:p-8">
			<div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
				<div>
					<h1 className="mb-2 text-h1 font-bold text-foreground">{greeting}</h1>
					<p className="max-w-2xl text-bodylg text-muted-foreground">
						เลือกคอร์สแรกของคุณเพื่อเริ่มเรียน — ทุกคอร์สมีบทเรียนตัวอย่างให้ดูฟรีก่อนซื้อ
					</p>
				</div>
				<Link
					href="/courses"
					className="inline-flex h-11 items-center justify-center gap-2 self-start rounded-button bg-primary px-5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover lg:self-auto"
				>
					ดูคอร์สทั้งหมด <ArrowRight size={16} weight="bold" />
				</Link>
			</div>

			<ol className="mt-8 grid gap-4 md:grid-cols-3">
				{STEPS.map((step, idx) => {
					const Icon = step.icon;
					return (
						<li
							key={step.label}
							className="flex items-start gap-3 rounded-card border border-border bg-card p-4"
						>
							<div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-radius-button bg-primary/10 text-primary">
								<Icon size={20} weight="bold" />
							</div>
							<div className="min-w-0">
								<div className="text-uism font-semibold text-foreground">
									<span className="num text-primary">{idx + 1}.</span>{" "}
									<span>{step.label}</span>
								</div>
								<p className="mt-0.5 text-caption text-muted-foreground">
									{step.body}
								</p>
							</div>
						</li>
					);
				})}
			</ol>
		</div>
	);
}
