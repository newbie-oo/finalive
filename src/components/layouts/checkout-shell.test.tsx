import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { CheckoutShell, CHECKOUT_STEPS } from "./checkout-shell";

describe("CheckoutShell", () => {
	it("ships a 4-step canonical checkout model", () => {
		expect(CHECKOUT_STEPS.map((s) => s.label)).toEqual([
			"ตรวจคำสั่งซื้อ",
			"อัปโหลดสลิป",
			"รอตรวจสอบ",
			"เสร็จสิ้น",
		]);
	});

	function currentStepLabel(): string {
		const indicator = document.querySelector('[aria-current="step"]');
		// The label lives in a sibling <span> within the same step wrapper div.
		const wrapper = indicator?.parentElement;
		return wrapper?.textContent?.trim() ?? "";
	}

	it("marks step 0 as current when payment info is being reviewed", () => {
		render(
			<CheckoutShell step={0}>
				<p>x</p>
			</CheckoutShell>,
		);
		expect(currentStepLabel()).toContain("ตรวจคำสั่งซื้อ");
	});

	it("marks the final step as current on the success page", () => {
		render(
			<CheckoutShell step={3}>
				<p>x</p>
			</CheckoutShell>,
		);
		expect(currentStepLabel()).toContain("เสร็จสิ้น");
	});
});
