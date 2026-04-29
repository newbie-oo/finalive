// Inspects a Bunny Stream video record + its HLS master playlist to
// diagnose a length/duration mismatch between Bunny's reported `length`
// and what the player actually decodes.
//
// Usage: pnpm tsx --env-file=.env.local scripts/debug-bunny-video.ts <videoId>

import { getEnv } from "@/lib/env";

async function main() {
  const videoId = process.argv[2];
  if (!videoId) {
    console.error("usage: tsx debug-bunny-video.ts <videoId>");
    process.exit(1);
  }
  const env = getEnv();
  const lib = env.BUNNY_LIBRARY_ID;
  const key = env.BUNNY_API_KEY;
  if (!lib || !key) {
    console.error("BUNNY_LIBRARY_ID / BUNNY_API_KEY not configured");
    process.exit(1);
  }

  const res = await fetch(`https://video.bunnycdn.com/library/${lib}/videos/${videoId}`, {
    headers: { AccessKey: key, Accept: "application/json" },
  });
  if (!res.ok) {
    console.error("Bunny API error", res.status, await res.text());
    process.exit(1);
  }
  const data = (await res.json()) as Record<string, unknown>;

  console.warn("== Bunny video record ==");
  for (const key of [
    "guid",
    "title",
    "status",
    "length",
    "framerate",
    "rotation",
    "width",
    "height",
    "encodeProgress",
    "storageSize",
    "availableResolutions",
    "outputCodecs",
    "videoLibraryId",
  ]) {
    console.warn(`${key}:`, data[key]);
  }

  // Try the public HLS playlist (no token — works only if library is set
  // to allow direct play; otherwise this prints the auth-required body).
  const cdnHostname = data.videoLibraryId
    ? `vz-${data.videoLibraryId}.b-cdn.net`
    : null;
  if (cdnHostname) {
    const url = `https://${cdnHostname}/${videoId}/playlist.m3u8`;
    console.warn("\n== HLS master playlist (anon) ==", url);
    const m = await fetch(url);
    console.warn("HTTP", m.status);
    if (m.ok) console.warn(await m.text());
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
