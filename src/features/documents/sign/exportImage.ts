import type { PlacedSignature, SignDocumentSource, SignExportResult } from "./types";

export async function exportSignedImage(
  source: SignDocumentSource,
  signatures: PlacedSignature[],
  signaturePng: ArrayBuffer,
): Promise<SignExportResult> {
  const page = source.pages[0];
  if (!page) throw new Error("No page to export");

  const sigImg = await loadSignatureBitmap(signaturePng);
  const canvas = document.createElement("canvas");
  canvas.width = page.nativeWidth;
  canvas.height = page.nativeHeight;
  const ctx = canvas.getContext("2d")!;

  if (page.bitmap) {
    ctx.drawImage(page.bitmap, 0, 0);
  } else {
    const bg = await loadHtmlImage(page.previewUrl);
    ctx.drawImage(bg, 0, 0, page.nativeWidth, page.nativeHeight);
  }

  const pageSigs = signatures.filter((s) => s.pageIndex === 0);
  for (const sig of pageSigs) {
    drawSignature(ctx, sigImg, sig, page.nativeWidth, page.nativeHeight);
  }

  sigImg.close();

  const blob = await canvasToBlob(canvas, "image/png");
  const stem = source.file.name.replace(/\.[^.]+$/, "");
  return { blob, mime: "image/png", filename: `${stem}-signed.png` };
}

export function drawSignature(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  sigImg: CanvasImageSource,
  sig: PlacedSignature,
  pageW: number,
  pageH: number,
): void {
  const x = sig.x * pageW;
  const y = sig.y * pageH;
  const w = sig.w * pageW;
  const h = sig.h * pageH;
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate((sig.rotation * Math.PI) / 180);
  ctx.drawImage(sigImg, -w / 2, -h / 2, w, h);
  ctx.restore();
}

async function loadSignatureBitmap(png: ArrayBuffer): Promise<ImageBitmap> {
  const blob = new Blob([png], { type: "image/png" });
  return createImageBitmap(blob);
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load page image"));
    img.src = src;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Export failed"))), type);
  });
}
