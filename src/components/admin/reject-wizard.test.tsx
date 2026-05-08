import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RejectWizard } from "./reject-wizard";

describe("RejectWizard", () => {
	it("blocks 'ถัดไป' on the reason step until a reason is selected", () => {
		render(<RejectWizard busy={false} onCancel={() => {}} onSubmit={() => {}} />);
		const next = screen.getByRole("button", { name: "ถัดไป" });
		expect(next).toBeDisabled();
		fireEvent.click(screen.getByLabelText("ภาพไม่ชัด"));
		expect(next).toBeEnabled();
	});

	it("walks through reason → note → confirm and submits with reason+note", () => {
		const onSubmit = vi.fn();
		render(
			<RejectWizard busy={false} onCancel={() => {}} onSubmit={onSubmit} />,
		);

		fireEvent.click(screen.getByLabelText("ยอดเงินไม่ตรง"));
		fireEvent.click(screen.getByRole("button", { name: "ถัดไป" }));

		const textarea = screen.getByLabelText("หมายเหตุ", { exact: false });
		fireEvent.change(textarea, { target: { value: "ยอดสลิปต่างจากที่ต้องชำระ" } });
		fireEvent.click(screen.getByRole("button", { name: "ถัดไป" }));

		expect(screen.getByText("ยืนยันการปฏิเสธ")).toBeInTheDocument();
		expect(screen.getByText("ยอดสลิปต่างจากที่ต้องชำระ")).toBeInTheDocument();

		fireEvent.click(screen.getByRole("button", { name: "ปฏิเสธสลิป" }));
		expect(onSubmit).toHaveBeenCalledWith({
			reason: "wrong_amount",
			note: "ยอดสลิปต่างจากที่ต้องชำระ",
		});
	});

	it("invokes onCancel when 'ยกเลิก' is clicked", () => {
		const onCancel = vi.fn();
		render(<RejectWizard busy={false} onCancel={onCancel} onSubmit={() => {}} />);
		fireEvent.click(screen.getByRole("button", { name: "ยกเลิก" }));
		expect(onCancel).toHaveBeenCalledOnce();
	});
});
