import { getEnv } from "@/lib/env";

export interface BunnyStreamClient {
	createVideo(title: string): Promise<string>;
	deleteVideo(guid: string): Promise<void>;
}

export class HttpBunnyStreamClient implements BunnyStreamClient {
	private readonly apiBase = "https://video.bunnycdn.com";

	private getCredentials(): { libraryId: string; apiKey: string } {
		const env = getEnv();
		const libraryId = env.BUNNY_LIBRARY_ID;
		const apiKey = env.BUNNY_API_KEY;
		if (!libraryId || !apiKey) {
			throw new Error("Bunny credentials not configured");
		}
		return { libraryId, apiKey };
	}

	async createVideo(title: string): Promise<string> {
		const { libraryId, apiKey } = this.getCredentials();
		const res = await fetch(`${this.apiBase}/library/${libraryId}/videos`, {
			method: "POST",
			headers: {
				AccessKey: apiKey,
				"content-type": "application/json",
				accept: "application/json",
			},
			body: JSON.stringify({ title }),
		});
		if (!res.ok) {
			throw new Error(`Bunny create failed ${res.status}: ${await res.text()}`);
		}
		const data = (await res.json()) as { guid: string };
		return data.guid;
	}

	async deleteVideo(guid: string): Promise<void> {
		const { libraryId, apiKey } = this.getCredentials();
		await fetch(`${this.apiBase}/library/${libraryId}/videos/${guid}`, {
			method: "DELETE",
			headers: { AccessKey: apiKey },
		});
	}

	uploadUrl(guid: string): string {
		const { libraryId } = this.getCredentials();
		return `${this.apiBase}/library/${libraryId}/videos/${guid}`;
	}
}
