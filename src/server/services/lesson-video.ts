import type { BunnyStreamClient } from "./bunny-stream";

export interface LessonVideoDeps {
  bunny: BunnyStreamClient;
  getLessonVideoMediaId: (lessonId: string) => Promise<string | null>;
  createVideoAsset: (args: {
    storageKey: string;
    userId: string;
  }) => Promise<{ id: string }>;
  updateLessonVideo: (
    lessonId: string,
    mediaAssetId: string | null,
  ) => Promise<void>;
  findAssetByBunnyId: (bunnyVideoId: string) => Promise<{ id: string } | null>;
  findPreviousVideoMediaId: (
    lessonId: string,
    excludeAssetId: string,
  ) => Promise<string | null>;
  deleteMediaAsset: (assetId: string) => Promise<void>;
}

export interface CreateVideoResult {
  bunnyVideoId: string;
  assetId: string;
  uploadUrl: string;
  oldMediaId: string | null;
}

export interface CancelVideoResult {
  restoredMediaId: string | null;
}

/**
 * Orchestrates the two-step Bunny video upload for lessons:
 * create → client upload → webhook ready, or cancel → restore old video.
 */
export class LessonVideoService {
  constructor(private deps: LessonVideoDeps) {}

  async createVideo(params: {
    lessonId: string;
    fileName: string;
    userId: string;
  }): Promise<CreateVideoResult> {
    const bunnyVideoId = await this.deps.bunny.createVideo(params.fileName);

    const oldMediaId = await this.deps.getLessonVideoMediaId(params.lessonId);

    const asset = await this.deps.createVideoAsset({
      storageKey: bunnyVideoId,
      userId: params.userId,
    });

    await this.deps.updateLessonVideo(params.lessonId, asset.id);

    return {
      bunnyVideoId,
      assetId: asset.id,
      uploadUrl:
        (
          this.deps.bunny as unknown as { uploadUrl?: (guid: string) => string }
        ).uploadUrl?.(bunnyVideoId) ?? "",
      oldMediaId,
    };
  }

  async cancelVideo(params: {
    lessonId: string;
    bunnyVideoId: string;
  }): Promise<CancelVideoResult> {
    const asset = await this.deps.findAssetByBunnyId(params.bunnyVideoId);

    // Best-effort delete at Bunny — failure here should not block restore.
    try {
      await this.deps.bunny.deleteVideo(params.bunnyVideoId);
    } catch {
      /* swallowed */
    }

    if (!asset) {
      return { restoredMediaId: null };
    }

    const prevMediaId = await this.deps.findPreviousVideoMediaId(
      params.lessonId,
      asset.id,
    );

    await this.deps.updateLessonVideo(params.lessonId, prevMediaId);
    await this.deps.deleteMediaAsset(asset.id);

    return { restoredMediaId: prevMediaId };
  }
}
