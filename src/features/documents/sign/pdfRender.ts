import * as pdfjsLib from "pdfjs-dist";
import type { SignPage } from "./types";

let workerSrcSet = false;

function ensurePdfWorker(): void {
  if (workerSrcSet) return;
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://unpkg.com/pdfjs-dist@3.10.111/build/pdf.worker.min.js";
  workerSrcSet = true;
}

export async function renderPdfPages(
  data: ArrayBuffer,
  scale = 2,
): Promise<{ pages: SignPage[]; numPages: number }> {
  ensurePdfWorker();
  const pdf = await pdfjsLib.getDocument({ data: data.slice(0) }).promise;
  const pages: SignPage[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport }).promise;

    const bitmap = await createImageBitmap(canvas);
    const previewUrl = canvas.toDataURL("image/png");

    pages.push({
      index: i - 1,
      nativeWidth: canvas.width,
      nativeHeight: canvas.height,
      previewUrl,
      bitmap,
    });
  }

  return { pages, numPages: pdf.numPages };
}

export function revokeSignPages(pages: SignPage[]): void {
  for (const p of pages) {
    if (p.previewUrl.startsWith("blob:")) {
      URL.revokeObjectURL(p.previewUrl);
    }
    p.bitmap?.close();
  }
}
