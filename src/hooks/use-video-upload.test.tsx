import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useVideoUpload } from "./use-video-upload";

function makeMockXHR() {
	return {
		open: vi.fn(),
		send: vi.fn(),
		abort: vi.fn(),
		setRequestHeader: vi.fn(),
		upload: {} as { onprogress?: (ev: ProgressEvent) => void; onload?: () => void },
		onerror: vi.fn(),
		onabort: vi.fn(),
		onload: vi.fn(),
		status: 200,
		responseText: "",
	};
}

beforeEach(() => {
	vi.stubGlobal("XMLHttpRequest", vi.fn(() => makeMockXHR()));
	vi.stubGlobal("fetch", vi.fn());
});

function getFetchMock() {
	return vi.mocked(globalThis.fetch);
}

function getXhrMock() {
	return vi.mocked(globalThis.XMLHttpRequest).mock.results[0]
		?.value as ReturnType<typeof makeMockXHR>;
}

describe("useVideoUpload", () => {
	it("starts in idle state", () => {
		const { result } = renderHook(() =>
			useVideoUpload({ courseId: "c1", lessonId: "l1" }),
		);
		expect(result.current.phase).toBe("idle");
		expect(result.current.progress).toBe(0);
		expect(result.current.error).toBeNull();
		expect(result.current.bunnyVideoId).toBeNull();
	});

	it("transitions idle→creating→uploading→processing→done on success", async () => {
		const fetchMock = getFetchMock();
		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				ok: true,
				bunnyVideoId: "vid-1",
				uploadUrl: "https://bunny.test/upload",
				apiKey: "key-1",
			}),
		} as Response);

		const { result } = renderHook(() =>
			useVideoUpload({ courseId: "c1", lessonId: "l1" }),
		);

		const file = new File(["vid"], "test.mp4", { type: "video/mp4" });
		await act(async () => {
			await result.current.upload(file);
		});

		expect(result.current.phase).toBe("uploading");

		// Simulate progress
		const xhr = getXhrMock();
		act(() => {
			xhr.upload.onprogress?.({
				lengthComputable: true,
				loaded: 50,
				total: 100,
			} as ProgressEvent);
		});
		expect(result.current.progress).toBe(50);

		// Simulate upload complete
		act(() => {
			xhr.upload.onload?.();
		});
		expect(result.current.phase).toBe("processing");

		// Simulate server response
		act(() => {
			xhr.onload?.();
		});

		await waitFor(() => {
			expect(result.current.phase).toBe("done");
		});
		expect(result.current.progress).toBe(100);
		expect(result.current.bunnyVideoId).toBe("vid-1");
		expect(result.current.error).toBeNull();
	});

	it("transitions to error when create API fails", async () => {
		const fetchMock = getFetchMock();
		fetchMock.mockResolvedValueOnce({
			ok: false,
			status: 500,
			json: async () => ({ message: "server down" }),
		} as Response);

		const { result } = renderHook(() =>
			useVideoUpload({ courseId: "c1", lessonId: "l1" }),
		);

		const file = new File(["vid"], "test.mp4", { type: "video/mp4" });
		await act(async () => {
			await result.current.upload(file);
		});

		expect(result.current.phase).toBe("error");
		expect(result.current.error).toBe("server down");
	});

	it("transitions to error on network failure during upload", async () => {
		const fetchMock = getFetchMock();
		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				ok: true,
				bunnyVideoId: "vid-1",
				uploadUrl: "https://bunny.test/upload",
				apiKey: "key-1",
			}),
		} as Response);

		const { result } = renderHook(() =>
			useVideoUpload({ courseId: "c1", lessonId: "l1" }),
		);

		const file = new File(["vid"], "test.mp4", { type: "video/mp4" });
		await act(async () => {
			await result.current.upload(file);
		});

		const xhr = getXhrMock();
		act(() => {
			xhr.onerror?.();
		});

		expect(result.current.phase).toBe("error");
		expect(result.current.error).toMatch(/เครือข่ายขัดข้อง/);
		expect(fetchMock).toHaveBeenLastCalledWith(
			"/api/admin/lesson-video",
			expect.objectContaining({
				body: expect.stringContaining("cancel"),
			}),
		);
	});

	it("transitions to error when Bunny returns non-2xx", async () => {
		const fetchMock = getFetchMock();
		fetchMock.mockResolvedValueOnce({
			ok: true,
			json: async () => ({
				ok: true,
				bunnyVideoId: "vid-1",
				uploadUrl: "https://bunny.test/upload",
				apiKey: "key-1",
			}),
		} as Response);

		const { result } = renderHook(() =>
			useVideoUpload({ courseId: "c1", lessonId: "l1" }),
		);

		const file = new File(["vid"], "test.mp4", { type: "video/mp4" });
		await act(async () => {
			await result.current.upload(file);
		});

		const xhr = getXhrMock();
		xhr.status = 403;
		xhr.responseText = JSON.stringify({ message: "Forbidden" });
		act(() => {
			xhr.onload?.();
		});

		expect(result.current.phase).toBe("error");
		expect(result.current.error).toBe("Forbidden");
	});

	it("calls cancel API and resets to idle when cancel() invoked", async () => {
		const fetchMock = getFetchMock();
		fetchMock.mockResolvedValue({
			ok: true,
			json: async () => ({
				ok: true,
				bunnyVideoId: "vid-1",
				uploadUrl: "https://bunny.test/upload",
				apiKey: "key-1",
			}),
		} as Response);

		const { result } = renderHook(() =>
			useVideoUpload({ courseId: "c1", lessonId: "l1" }),
		);

		const file = new File(["vid"], "test.mp4", { type: "video/mp4" });
		await act(async () => {
			await result.current.upload(file);
		});

		const xhr = getXhrMock();
		act(() => {
			result.current.cancel();
		});

		expect(xhr.abort).toHaveBeenCalled();
		expect(fetchMock).toHaveBeenLastCalledWith(
			"/api/admin/lesson-video",
			expect.objectContaining({
				body: expect.stringContaining("cancel"),
			}),
		);
		expect(result.current.phase).toBe("idle");
		expect(result.current.progress).toBe(0);
	});

	it("rejects non-video files immediately", async () => {
		const { result } = renderHook(() =>
			useVideoUpload({ courseId: "c1", lessonId: "l1" }),
		);

		const file = new File(["txt"], "test.txt", { type: "text/plain" });
		await act(async () => {
			await result.current.upload(file);
		});

		expect(result.current.phase).toBe("idle");
		expect(getFetchMock()).not.toHaveBeenCalled();
	});
});
