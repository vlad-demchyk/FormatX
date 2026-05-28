import type { DocumentConverter } from "./interface";
import { PdfLibAdapter } from "./pdfLibAdapter";
import { MammothAdapter } from "./mammothAdapter";
import { PdfJsAdapter } from "./pdfJsAdapter";
import { MarkedAdapter } from "./markedAdapter";
import { XlsxAdapter } from "./xlsxAdapter";
import { PdfToDocxAdapter } from "./pdfToDocxAdapter";
import { TextToMarkdownAdapter } from "./textToMarkdownAdapter";
import { MarkdownToDocxAdapter } from "./markdownToDocxAdapter";
import { MarkdownToPdfAdapter } from "./markdownToPdfAdapter";
import type { DocumentFormatId, ConversionRequest, ConversionResult } from "../types";

const converters: DocumentConverter[] = [
  new PdfLibAdapter(),
  new PdfToDocxAdapter(),
  new MammothAdapter(),
  new PdfJsAdapter(),
  new MarkedAdapter(),
  new XlsxAdapter(),
  new TextToMarkdownAdapter(),
  new MarkdownToDocxAdapter(),
  new MarkdownToPdfAdapter(),
];

/** Find the first converter that can handle this conversion */
export function findConverter(from: DocumentFormatId, to: DocumentFormatId): DocumentConverter | null {
  const found = converters.find((c) => c.canConvert(from, to)) ?? null;
  console.log("[FormatX] findConverter", from, "→", to, "=>", found?.name ?? null);
  return found;
}

/**
 * Convert a document using the first available converter.
 * Throws if no converter found.
 */
export async function convertDocument(request: ConversionRequest): Promise<ConversionResult> {
  console.log("[FormatX] convertDocument", request.file.name, request.inputFormat, "→", request.outputFormat);
  const converter = findConverter(request.inputFormat, request.outputFormat);
  if (!converter) {
    throw new Error(
      `No converter available for ${request.inputFormat.toUpperCase()} → ${request.outputFormat.toUpperCase()}`,
    );
  }
  try {
    const result = await converter.convert(request);
    console.log("[FormatX] convertDocument success:", result.filename, result.mime, result.blob.size);
    return result;
  } catch (e) {
    console.error("[FormatX] convertDocument error:", converter.name, e);
    throw e;
  }
}

export { PdfLibAdapter, MammothAdapter };
export type { DocumentConverter };
