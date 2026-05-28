import { PDFDocument, degrees } from "pdf-lib";
import type { PlacedSignature, SignDocumentSource, SignExportResult } from "./types";

export async function exportSignedPdf(
  source: SignDocumentSource,
  signatures: PlacedSignature[],
  signaturePng: ArrayBuffer,
): Promise<SignExportResult> {
  const pdfDoc = await PDFDocument.load(source.originalBytes);
  const pngImage = await pdfDoc.embedPng(signaturePng);
  const pages = pdfDoc.getPages();

  for (const sig of signatures) {
    const page = pages[sig.pageIndex];
    if (!page) continue;
    const { width, height } = page.getSize();
    const sigW = sig.w * width;
    const sigH = sig.h * height;
    const x = sig.x * width;
    const y = height - (sig.y + sig.h) * height;

    page.drawImage(pngImage, {
      x,
      y,
      width: sigW,
      height: sigH,
      rotate: degrees(sig.rotation),
    });
  }

  const pdfBytes = await pdfDoc.save();
  const stem = source.file.name.replace(/\.[^.]+$/, "");
  return {
    blob: new Blob([pdfBytes], { type: "application/pdf" }),
    mime: "application/pdf",
    filename: `${stem}-signed.pdf`,
  };
}
