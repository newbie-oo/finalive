import Link from "next/link";
import { Shield } from "@phosphor-icons/react/dist/ssr";
import { Stepper } from "@/components/ui/stepper";

const DEFAULT_STEPS = [
	{ label: "ข้อมูล" },
	{ label: "ชำระเงิน" },
	{ label: "เสร็จสิ้น" },
];

export function CheckoutShell({
	step,
	steps,
	children,
}: {
	/** Zero-based step index. 0=info, 1=payment, 2=done */
	step: 0 | 1 | 2;
	steps?: { label: string }[];
	children: React.ReactNode;
}) {
	const resolvedSteps = steps ?? DEFAULT_STEPS;
	return (
		<div className="flex min-h-full flex-col">
			<a
				href="#main"
				className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-100 focus:rounded-md focus:bg-(--primary) focus:px-3 focus:py-2 focus:text-(--primary-fg)"
			>
				ข้ามไปยังเนื้อหา
			</a>
			<header className="relative flex h-16 items-center justify-center border-b border-(--border) bg-(--background)">
				<Link href="/" className="flex items-center gap-2 text-(--foreground)">
					<span
						className="h-2.5 w-2.5 rounded-full bg-(--primary)"
						aria-hidden
					/>
					<span className="text-[18px] font-semibold tracking-tight">
						Finalive
					</span>
				</Link>
				<div className="absolute right-6 flex items-center gap-1.5 text-uism text-(--foreground-muted)">
					<Shield size={16} className="text-(--success)" />
					<span>การชำระเงินปลอดภัย</span>
				</div>
			</header>

			<div className="border-b border-(--border) bg-(--surface-muted)/40 py-5">
				<div className="mx-auto max-w-[640px] px-6">
					<Stepper steps={resolvedSteps} current={step} />
				</div>
			</div>

			<main
				id="main"
				className="mx-auto w-full max-w-[1200px] flex-1 px-6 py-8"
			>
				{children}
			</main>

			<footer className="border-t border-(--border) py-6">
				<div className="mx-auto max-w-[1200px] px-6 text-caption text-(--foreground-subtle)">
					ต้องการความช่วยเหลือ? ติดต่อ hello@finalive.dev
				</div>
			</footer>
		</div>
	);
}
