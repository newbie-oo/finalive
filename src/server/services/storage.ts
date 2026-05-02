import "server-only";
import { putObject, deleteObject, publicUrl, type R2Bucket } from "./r2";

export interface ObjectStorage {
	put(key: string, body: Buffer, contentType: string): Promise<void>;
	delete(key: string): Promise<void>;
	urlFor(key: string): string;
}

export class R2ObjectStorage implements ObjectStorage {
	constructor(private bucket: R2Bucket) {}

	async put(key: string, body: Buffer, contentType: string): Promise<void> {
		await putObject({ bucket: this.bucket, key, body, contentType });
	}

	async delete(key: string): Promise<void> {
		await deleteObject({ bucket: this.bucket, key });
	}

	urlFor(key: string): string {
		return publicUrl(key);
	}
}
