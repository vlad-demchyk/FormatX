/// <reference lib="webworker" />

export interface RasterizeRequest {
  id: string;
  /** ImageBitmap transferred from the main thread (already decoded). */
  bitmap: ImageBitmap;
  outMime: string;
  quality: number;
}

export interface RasterizeResponse {
  id: string;
  blob: Blob;
}

self.onmessage = async (e: MessageEvent<RasterizeRequest>) => {
  const { id, bitmap, outMime, quality } = e.data;

  try {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("OffscreenCanvas 2D context unavailable");

    ctx.drawImage(bitmap, 0, 0);
    bitmap.close();

    const mime = outMime || "image/png";
    const q = mime === "image/png" ? undefined : Math.min(1, Math.max(0.1, quality / 100));
    const outBlob = await canvas.convertToBlob({ type: mime, quality: q });

    self.postMessage({ id, blob: outBlob } satisfies RasterizeResponse);
  } catch (err) {
    self.postMessage({ id, error: err instanceof Error ? err.message : String(err) });
  }
};
