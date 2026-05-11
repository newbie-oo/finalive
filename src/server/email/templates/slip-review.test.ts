import { describe, it, expect } from "vitest";
import { render } from "@react-email/components";
import { SlipAccepted, slipAcceptedSubject } from "./slip-accepted";
import { SlipRejected, slipRejectedSubject } from "./slip-rejected";

const BASE = "https://finalive.dev";

describe("slip-accepted (E05)", () => {
	it("renders subject + course + ref + learn URL", async () => {
		const html = await render(
			SlipAccepted({
				name: "สมชาย",
				courseTitle: "Money 101",
				courseSlug: "money-101",
				refCode: "FL-12345678",
				amount: "199.00",
				baseUrl: BASE,
			}),
		);
		expect(html).toContain("ได้รับสิทธิ์เรียนแล้ว");
		expect(html).toContain("Money 101");
		expect(html).toContain("FL-12345678");
		expect(html).toContain(`${BASE}/learn/money-101`);
		expect(slipAcceptedSubject).toContain("ได้รับสิทธิ์เรียนแล้ว");
	});
});

describe("slip-rejected (E06)", () => {
	it("renders reason + retry URL pointing to by-ref checkout", async () => {
		const html = await render(
			SlipRejected({
				name: "สมชาย",
				courseTitle: "Money 101",
				refCode: "FL-87654321",
				amount: "199.00",
				reasonLabel: "ภาพไม่ชัด",
				note: "ขอภาพชัดกว่านี้",
				baseUrl: BASE,
			}),
		);
		expect(html).toContain("สลิปยังตรวจไม่ผ่าน");
		expect(html).toContain("ภาพไม่ชัด");
		expect(html).toContain("ขอภาพชัดกว่านี้");
		expect(html).toContain(`${BASE}/checkout/by-ref/FL-87654321`);
		expect(slipRejectedSubject).toContain("สลิปยังตรวจไม่ผ่าน");
	});

	it("omits the note row when note is null", async () => {
		const html = await render(
			SlipRejected({
				name: "X",
				courseTitle: "C",
				refCode: "FL-00000000",
				amount: "0.00",
				reasonLabel: "อื่นๆ",
				note: null,
				baseUrl: BASE,
			}),
		);
		expect(html).not.toContain("หมายเหตุ");
	});
});
