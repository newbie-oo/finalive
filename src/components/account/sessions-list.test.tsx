import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SessionsList, describeUserAgent } from "./sessions-list";

describe("describeUserAgent", () => {
	it("recognises Chrome on macOS", () => {
		const result = describeUserAgent(
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
		);
		expect(result.browser).toBe("Chrome");
		expect(result.os).toBe("macOS");
		expect(result.deviceKind).toBe("laptop");
	});

	it("recognises Safari on iPhone as mobile", () => {
		const result = describeUserAgent(
			"Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1",
		);
		expect(result.browser).toBe("Safari");
		expect(result.os).toBe("iOS");
		expect(result.deviceKind).toBe("mobile");
	});

	it("falls back to a sensible label when nothing matches", () => {
		const result = describeUserAgent("");
		expect(result.browser).toBe("เบราว์เซอร์ที่ไม่รู้จัก");
		expect(result.os).toBe("ไม่ทราบระบบ");
		expect(result.deviceKind).toBe("desktop");
	});
});

describe("SessionsList", () => {
	it("renders a 'this device' row using the supplied user agent", () => {
		const ua =
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
		render(<SessionsList userAgent={ua} />);
		expect(screen.getByText(/Chrome บน macOS/)).toBeInTheDocument();
		expect(screen.getByText("อุปกรณ์นี้")).toBeInTheDocument();
	});
});
