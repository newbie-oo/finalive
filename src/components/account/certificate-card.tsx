import Link from "next/link";
import {
	Certificate as CertIcon,
	DownloadSimple,
	ShareNetwork,
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
 * Credential-style certificate card. Replaces the previous generic card
 * with a brand-banded badge band on top + the credential metadata + two
 * primary actions (download PDF + share verify link). Revoked credentials
 * are visually distinct: status chip flips to destructive and the card
 * surfaces the revocation date.
 */
export function CertificateCard({ certificate }: CertificateCardProps) {
	const { certCode, courseTitle, issuedAt, pdfUrl, revokedAt } = certificate;
	const revoked = revokedAt !== null;

	return (
		<Card className="flex h-full flex-col overflow-hidden p-0">
			<div
				data-testid="cert-badge-band"
				aria-hidden
				className="relative flex h-24 items-center justify-center bg-gradient-to-br from-primary to-primary-hover"
			>
				<CertIcon
					size={40}
					weight="fill"
					className="text-primary-foreground"
				/>
				{revoked && (
					<div
						aria-hidden
						className="absolute inset-0 bg-destructive/40 mix-blend-multiply"
					/>
				)}
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
							<ShareNetwork size={14} weight="bold" /> แชร์ลิงก์ตรวจ
						</Link>
					</Button>
				</div>
			</div>
		</Card>
	);
}
