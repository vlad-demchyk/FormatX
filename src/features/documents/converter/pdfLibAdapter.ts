import { PDFDocument } from "pdf-lib";
import type { DocumentFormatId, ConversionRequest, ConversionResult } from "../types";
import type { DocumentConverter } from "./interface";

/**
 * pdf-lib adapter: merge PDFs, split PDFs, basic PDF operations.
 * Cannot convert between different formats (no DOCX→PDF).
 */
export class PdfLibAdapter implements DocumentConverter {
  readonly name = "pdf-lib";

  canConvert(from: DocumentFormatId, to: DocumentFormatId): boolean {
    return from === "pdf" && to === "pdf";
  }

  async convert(request: ConversionRequest): Promise<ConversionResult> {
    const srcDoc = await PDFDocument.load(request.data);

    // If single PDF, return as-is (copy)
    const pdfBytes = await srcDoc.save();

    return {
      blob: new Blob([pdfBytes], { type: "application/pdf" }),
      mime: "application/pdf",
      filename: request.file.name.replace(/\.[^.]+$/, ".pdf"),
    };
  }
}

/**
 * Merge multiple PDFs into one.
 * Called from DocumentsPage with selected items.
 */
export async function mergePdfs(files: File[]): Promise<Blob> {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const buf = await file.arrayBuffer();
    const srcDoc = await PDFDocument.load(buf);
    const pages = await mergedPdf.copyPages(srcDoc, srcDoc.getPageIndices());
    for (const page of pages) {
      mergedPdf.addPage(page);
    }
  }

  const pdfBytes = await mergedPdf.save();
  return new Blob([pdfBytes], { type: "application/pdf" });
}

/**
 * Split a PDF into individual pages, returning an array of blobs.
 */
export async function splitPdf(file: File): Promise<Blob[]> {
  const buf = await file.arrayBuffer();
  const srcDoc = await PDFDocument.load(buf);
  const count = srcDoc.getPageCount();
  const blobs: Blob[] = [];

  for (let i = 0; i < count; i++) {
    const newDoc = await PDFDocument.create();
    const [page] = await newDoc.copyPages(srcDoc, [i]);
    newDoc.addPage(page);
    const pdfBytes = await newDoc.save();
    blobs.push(new Blob([pdfBytes], { type: "application/pdf" }));
  }

  return blobs;
}
