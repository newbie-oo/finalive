import Link from "next/link";
import { Certificate, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";

export function CertificateClaim({
	variant = "modal",
}: {
	variant?: "modal" | "banner";
}) {
	const isBanner = variant === "banner";

	return (
		<div
			className={
				isBanner
					? "flex items-center gap-4 rounded-card border border-success/30 bg-success-bg p-5"
					: "flex flex-col items-center gap-3 text-center"
			}
		>
			<div
				className={
					isBanner
						? "flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-success"
						: "flex h-16 w-16 items-center justify-center rounded-full bg-success/10 text-success"
				}
			>
				<Certificate
					size={isBanner ? 24 : 32}
					weight="fill"
					className={isBanner ? "text-white" : ""}
				/>
			</div>
			<div className={isBanner ? "min-w-0 flex-1" : ""}>
				<h2
					className={
						isBanner ? "text-uism font-semibold text-success-foreground" : "text-h2"
					}
				>
					จบคอร์สแล้ว! 🎉
				</h2>
				<p
					className={
						isBanner
							? "text-caption text-success-foreground/80"
							: "text-body text-muted-foreground"
					}
				>
					ยินดีด้วย! คุณเรียนครบทุกบทเรียนแล้ว ใบประกาศพร้อมให้ดาวน์โหลดและส่งทางอีเมล
				</p>
			</div>
			<Button asChild variant="primary" size="md">
				<Link href="/account/certificates">
					ดูใบประกาศ <ArrowRight size={14} weight="bold" />
				</Link>
			</Button>
		</div>
	);
}
