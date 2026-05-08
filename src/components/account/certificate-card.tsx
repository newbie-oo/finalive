import Link from "next/link";
import {
	Certificate as CertIcon,
	DownloadSimple,
	SealCheck,
	ArrowSquareOut,
} from "@phosphor-icons/react/dist/ssr";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/ui/status-chip";

export interface CertificateView {
	certCode: string;
	courseTitle: string;
	issuedAt: Date;
	pdfUrl: string;
	revokedAt: Date | null;
}

interface CertificateCardProps {
	certificate: CertificateView;
}

const TH_DATE = new Intl.DateTimeFormat("th-TH", {
	day: "2-digit",
	month: "short",
	year: "numeric",
});

/**
 * Credential-style certificate card. The badge band is tall enough to
 * read as a credential header — large embossed icon, decorative ring
 * pattern, plus a corner seal that signals "verified". Revoked
 * credentials desaturate the band and flip the chip + add a
 * revocation-date line.
 */
export function CertificateCard({ certificate }: CertificateCardProps) {
	const { certCode, courseTitle, issuedAt, pdfUrl, revokedAt } = certificate;
	const revoked = revokedAt !== null;

	return (
		<Card className="flex h-full flex-col overflow-hidden p-0">
			<div
				data-testid="cert-badge-band"
				aria-hidden
				className={`relative flex h-36 items-center justify-center overflow-hidden ${
					revoked
						? "bg-linear-to-br from-foreground-subtle to-muted-foreground"
						: "bg-linear-to-br from-primary via-primary-hover to-accent"
				}`}
			>
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0 opacity-[0.18]"
					style={{
						backgroundImage:
							"radial-gradient(circle at 20% 20%, rgba(255,255,255,0.7) 0px, transparent 60%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.5) 0px, transparent 50%)",
					}}
				/>
				<div
					aria-hidden
					className="pointer-events-none absolute inset-0"
					style={{
						backgroundImage:
							"repeating-linear-gradient(135deg, rgba(255,255,255,0.06) 0 2px, transparent 2px 14px)",
					}}
				/>
				<div className="relative flex flex-col items-center gap-2 text-primary-foreground">
					<div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/15 ring-2 ring-white/30 backdrop-blur-xs">
						<CertIcon size={32} weight="fill" />
					</div>
					<span className="mono text-uism font-semibold uppercase tracking-[0.18em] text-white/90">
						{certCode}
					</span>
				</div>
				<div
					className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-white ring-2 ring-white/30 backdrop-blur-xs"
					aria-hidden
				>
					<SealCheck size={16} weight="fill" />
				</div>
			</div>

			<div className="flex flex-1 flex-col gap-3 p-5">
				<div className="flex items-center justify-between gap-2">
					<StatusChip tone={revoked ? "destructive" : "success"}>
						{revoked ? "ถูกเพิกถอน" : "ใช้งานได้"}
					</StatusChip>
					<span className="text-uism text-foreground-subtle">
						ออกเมื่อ {TH_DATE.format(issuedAt)}
					</span>
				</div>

				<h3 className="text-h4 line-clamp-2 text-foreground">{courseTitle}</h3>

				<p className="mono text-uism text-foreground-subtle">{certCode}</p>

				{revoked && revokedAt && (
					<p className="text-uism text-destructive">
						ถูกเพิกถอนเมื่อ {TH_DATE.format(revokedAt)}
					</p>
				)}

				<div className="mt-auto flex flex-wrap gap-2 pt-2">
					<Button asChild variant="primary" size="sm">
						<a href={pdfUrl} target="_blank" rel="noopener">
							<DownloadSimple size={14} weight="bold" /> ดาวน์โหลด PDF
						</a>
					</Button>
					<Button asChild variant="secondary" size="sm">
						<Link href={`/verify/${certCode}`}>
							<ArrowSquareOut size={14} weight="bold" /> เปิดหน้าตรวจสอบ
						</Link>
					</Button>
				</div>
			</div>
		</Card>
	);
}
