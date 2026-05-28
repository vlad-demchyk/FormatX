/**
 * Manages a pool of rasterisation workers for off-main-thread image processing.
 *
 * === Flow ===
 *  1. Main thread decodes the source into an `ImageBitmap`:
 *     - For SVG: uses an `<img>` element (most reliable SVG → canvas path).
 *     - For raster: uses `createImageBitmap` directly (fast, no DOM needed).
 *  2. The `ImageBitmap` is transferred to an idle worker.
 *  3. Worker draws it on `OffscreenCanvas` and calls `convertToBlob`.
 *  4. The resulting Blob is sent back to the main thread.
 */

import { WorkerPool } from "./workerPool";
import { logger } from "../logger";

let pool: WorkerPool | null = null;
let taskSeq = 0;

function getPool(): WorkerPool {
  if (!pool) {
    pool = new WorkerPool(
      () => new Worker(new URL("./svgConverter.worker.ts", import.meta.url), { type: "module" }),
    );
  }
  return pool;
}

export interface RasterizeOptions {
  /** Source file (File or Blob) to decode and convert. */
  source: Blob;
  outMime: string;
  quality: number;
}

/**
 * Decode any image (including SVG) into an ImageBitmap on the main thread.
 *
 * `createImageBitmap` works great for raster formats (JPEG, PNG, WebP, etc.)
 * but is unreliable for SVG blobs. For SVG we use an `<img>` element which
 * is the only universally reliable SVG → canvas path in browsers.
 */
async function decodeToBitmap(source: Blob): Promise<ImageBitmap> {
  const isSvgBlob =
    source.type === "image/svg+xml" ||
    (source instanceof File && source.name.toLowerCase().endsWith(".svg"));

  if (!isSvgBlob) {
    try {
      return await createImageBitmap(source);
    } catch (e) {
      // createImageBitmap can fail for some formats (e.g. some WebP variants).
      // Fallback to <img> decode.
      logger.warn("createImageBitmap failed, trying <img> fallback:", e);
      return decodeViaImage(source);
    }
  }

  // SVG path via <img>
  try {
    return await decodeViaImage(source);
  } catch {
    // If <img> fails, try reading SVG as text and creating a sanitized blob
    const text = await source.text();
    const cleaned = text
      .replace(/<!--[\s\S]*?-->/g, "") // strip comments
      .replace(/<\?xml[\s\S]*?\?>/, "") // strip XML declaration
      .trim();
    // Ensure xmlns
    const withNs = cleaned.includes('xmlns="http://www.w3.org/2000/svg"')
      ? cleaned
      : cleaned.replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"');
    // Ensure explicit width/height if viewBox exists
    const hasSize = /width\s*=|height\s*=/.test(withNs);
    const finalSvg = hasSize
      ? withNs
      : withNs.replace("<svg", '<svg width="300" height="150"');
    const fixedBlob = new Blob([finalSvg], { type: "image/svg+xml;charset=utf-8" });
    return decodeViaImage(fixedBlob);
  }
}

/** Load an image via <img> element and return an ImageBitmap. */
async function decodeViaImage(blob: Blob): Promise<ImageBitmap> {
  const url = URL.createObjectURL(blob);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error(`The source image could not be decoded (blob type: ${blob.type}).`));
      el.src = url;
    });
    const w = img.naturalWidth || img.width || 300;
    const h = img.naturalHeight || img.height || 150;
    const canvas = new OffscreenCanvas(w, h);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0);
    return canvas.transferToImageBitmap();
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Convert any image (including SVG) to a raster format Blob using a
 * Web Worker pool, keeping the UI responsive.
 */
export async function rasterizeWithWorker(options: RasterizeOptions): Promise<Blob> {
  const { source, outMime, quality } = options;

  const bitmap = await decodeToBitmap(source);

  const id = `img-${++taskSeq}`;
  const wp = getPool();

  const result = await wp.exec<{ blob: Blob }>(
    id,
    { id, bitmap, outMime, quality },
    [bitmap], // transfer ImageBitmap ownership to the worker
  );

  if (!result.ok) {
    throw new Error(result.error ?? "Worker rasterisation failed");
  }

  return result.data!.blob;
}
