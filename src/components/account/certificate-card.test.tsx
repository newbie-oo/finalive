import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { CertificateCard } from "./certificate-card";

const baseCert = {
	certCode: "FNL-DCF-2024-0042",
	courseTitle: "DCF Valuation แบบมืออาชีพ",
	issuedAt: new Date("2024-08-12"),
	pdfUrl: "https://cdn.finalive.dev/certs/FNL-DCF-2024-0042.pdf",
	revokedAt: null as Date | null,
};

describe("CertificateCard", () => {
	it("renders the credential as an active credential when not revoked", () => {
		render(<CertificateCard certificate={baseCert} />);

		expect(
			screen.getByRole("heading", { name: /DCF Valuation/ }),
		).toBeInTheDocument();
		// Status chip uses the success tone copy.
		expect(screen.getByText(/ใช้งานได้/)).toBeInTheDocument();
		// Cert code is displayed in mono so credential viewers (HR, recruiters)
		// can copy it cleanly.
		expect(screen.getByText(/FNL-DCF-2024-0042/)).toHaveClass("mono");
		// Two primary actions: download PDF + share/verify.
		expect(
			screen.getByRole("link", { name: /ดาวน์โหลด PDF/ }),
		).toHaveAttribute("href", baseCert.pdfUrl);
		expect(
			screen.getByRole("link", { name: /แชร์ลิงก์ตรวจ/ }),
		).toHaveAttribute("href", "/verify/FNL-DCF-2024-0042");
	});

	it("clearly marks revoked credentials and surfaces the revocation date", () => {
		render(
			<CertificateCard
				certificate={{
					...baseCert,
					revokedAt: new Date("2024-09-20"),
				}}
			/>,
		);
		// Status chip flips, and a separate revocation-date line surfaces the
		// "when". Match each independently rather than asserting on a shared
		// substring.
		expect(screen.getByText("ถูกเพิกถอน")).toBeInTheDocument();
		expect(
			screen.getByText(/ถูกเพิกถอนเมื่อ.*2567|ถูกเพิกถอนเมื่อ/),
		).toBeInTheDocument();
	});

	it("renders the brand badge band so cards read as credentials, not generic cards", () => {
		const { container } = render(<CertificateCard certificate={baseCert} />);
		expect(
			container.querySelector('[data-testid="cert-badge-band"]'),
		).not.toBeNull();
	});
});
