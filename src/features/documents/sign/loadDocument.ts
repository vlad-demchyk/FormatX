import { renderPdfPages } from "./pdfRender";
import type { SignDocumentSource, SignSourceKind } from "./types";

export function detectSignSourceKind(file: File): SignSourceKind {
  const name = file.name.toLowerCase();
  const mime = file.type.toLowerCase();
  if (mime.startsWith("image/") || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(name)) {
    return "image";
  }
  if (mime === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    return "docx";
  }
  if (mime === "application/msword" || name.endsWith(".doc")) return "doc";
  throw new Error("Unsupported file type for signing");
}

export function isCrossOriginIsolated(): boolean {
  return typeof crossOriginIsolated !== "undefined" && crossOriginIsolated;
}

export type LoadProgress = (message: string, percent?: number) => void;

export async function loadSignDocument(
  file: File,
  onProgress?: LoadProgress,
): Promise<SignDocumentSource> {
  const kind = detectSignSourceKind(file);
  const originalBytes = await file.arrayBuffer();
  onProgress?.("Loading document…", 10);

  if (kind === "image") {
    const pages = await loadImagePages(file);
    return { kind, file, originalBytes, pages };
  }

  if (kind === "pdf") {
    onProgress?.("Rendering PDF pages…", 30);
    const { pages } = await renderPdfPages(originalBytes);
    return { kind, file, originalBytes, pages };
  }

  if (!isCrossOriginIsolated()) {
    throw new Error("COEP_REQUIRED");
  }

  onProgress?.("Converting document for preview…", 20);
  const { convertDocToPdfForPreview } = await import("./libreOfficeLoader");
  const previewPdfBytes = await convertDocToPdfForPreview(originalBytes, file.name, onProgress);
  onProgress?.("Rendering pages…", 70);
  const { pages } = await renderPdfPages(previewPdfBytes);
  return { kind, file, originalBytes, pages, previewPdfBytes };
}

async function loadImagePages(file: File): Promise<SignDocumentSource["pages"]> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    const url = URL.createObjectURL(file);
    try {
      const img = await loadHtmlImage(url);
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0);
      bitmap = await createImageBitmap(canvas);
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0);
  const previewUrl = canvas.toDataURL("image/png");

  return [
    {
      index: 0,
      nativeWidth: bitmap.width,
      nativeHeight: bitmap.height,
      previewUrl,
      bitmap,
    },
  ];
}

function loadHtmlImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to decode image"));
    img.src = src;
  });
}
