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
    // Raster formats → fast path
    return createImageBitmap(source);
  }

  // SVG → slow but reliable path via <img>
  const url = URL.createObjectURL(source);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("The source image could not be decoded."));
      el.src = url;
    });
    const canvas = new OffscreenCanvas(img.naturalWidth || img.width, img.naturalHeight || img.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D context unavailable");
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
