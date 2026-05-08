// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from "vitest";
import { render, fireEvent, screen, waitFor } from "@testing-library/react";
import { SlipDropzone } from "./slip-dropzone";

vi.mock("sonner", () => ({
	toast: {
		error: vi.fn(),
		success: vi.fn(),
	},
}));

beforeAll(() => {
	if (typeof globalThis.ResizeObserver === "undefined") {
		globalThis.ResizeObserver = class {
			observe() {}
			unobserve() {}
			disconnect() {}
		} as unknown as typeof ResizeObserver;
	}
});

function makeFile(name: string, type: string, sizeBytes = 100): File {
	return new File([new Uint8Array(sizeBytes)], name, { type });
}

describe("SlipDropzone", () => {
	it("notifies onFileChange with a valid PNG", async () => {
		const onFileChange = vi.fn();
		render(<SlipDropzone onFileChange={onFileChange} />);

		const input = document.getElementById("slip-file") as HTMLInputElement;
		const file = makeFile("slip.png", "image/png");
		fireEvent.change(input, { target: { files: [file] } });

		await waitFor(() => {
			expect(onFileChange).toHaveBeenCalledWith(file);
		});
	});

	it("rejects oversize files (notifies onFileChange with null only on clear)", async () => {
		const onFileChange = vi.fn();
		const { toast } = await import("sonner");
		render(<SlipDropzone onFileChange={onFileChange} />);

		const input = document.getElementById("slip-file") as HTMLInputElement;
		const big = makeFile("big.png", "image/png", 6 * 1024 * 1024);
		fireEvent.change(input, { target: { files: [big] } });

		expect(toast.error).toHaveBeenCalledWith("ไฟล์ใหญ่เกิน 5 MB");
		expect(onFileChange).not.toHaveBeenCalled();
	});

	it("rejects unsupported types", async () => {
		const onFileChange = vi.fn();
		const { toast } = await import("sonner");
		render(<SlipDropzone onFileChange={onFileChange} />);

		const input = document.getElementById("slip-file") as HTMLInputElement;
		const txt = makeFile("notes.txt", "text/plain");
		fireEvent.change(input, { target: { files: [txt] } });

		expect(toast.error).toHaveBeenCalledWith(
			"รองรับเฉพาะ PNG, JPG, PDF, HEIC",
		);
		expect(onFileChange).not.toHaveBeenCalled();
	});

	it("emits null when the user clears the selection", async () => {
		const onFileChange = vi.fn();
		render(<SlipDropzone onFileChange={onFileChange} />);

		const input = document.getElementById("slip-file") as HTMLInputElement;
		const file = makeFile("slip.png", "image/png");
		fireEvent.change(input, { target: { files: [file] } });

		await waitFor(() => {
			expect(onFileChange).toHaveBeenLastCalledWith(file);
		});

		const clearBtn = screen.getByRole("button", { name: /Remove file/ });
		fireEvent.click(clearBtn);

		await waitFor(() => {
			expect(onFileChange).toHaveBeenLastCalledWith(null);
		});
	});

	it("uses the supplied inputId when rendering multiple instances", () => {
		render(
			<>
				<SlipDropzone inputId="slip-a" />
				<SlipDropzone inputId="slip-b" />
			</>,
		);
		expect(document.getElementById("slip-a")).not.toBeNull();
		expect(document.getElementById("slip-b")).not.toBeNull();
	});
});
