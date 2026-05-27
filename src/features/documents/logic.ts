import { detectFormat, canConvert, formatMime } from "./formatRegistry";
import type { DocumentFormatId, DocumentQueueItem, ConversionRequest, ConversionResult } from "./types";

export function baseName(name: string): string {
  return name.replace(/\.[^.\\/]+$/, "");
}

export function extFromFormat(id: DocumentFormatId): string {
  if (id === "pdf") return "pdf";
  if (id === "docx") return "docx";
  if (id === "doc") return "doc";
  if (id === "odt") return "odt";
  if (id === "rtf") return "rtf";
  if (id === "html") return "html";
  if (id === "txt") return "txt";
  return "bin";
}

export function buildOutputFilename(inputName: string, outputFormat: DocumentFormatId): string {
  const stem = baseName(inputName);
  return `${stem}.${extFromFormat(outputFormat)}`;
}

export function validateItem(item: ConversionRequest): string | null {
  if (!canConvert(item.inputFormat, item.outputFormat)) {
    return `Cannot convert ${item.inputFormat.toUpperCase()} → ${item.outputFormat.toUpperCase()}`;
  }
  return null;
}

export function createQueueItem(file: File, outputFormat: DocumentFormatId): DocumentQueueItem {
  return {
    id: crypto.randomUUID(),
    file,
    inputFormat: detectFormat(file),
    outputFormat,
    status: "pending",
    error: null,
    blobs: null,
    selected: true,
  };
}

export function buildResult(item: DocumentQueueItem, blob: Blob): ConversionResult {
  return {
    blob,
    mime: formatMime(item.outputFormat),
    filename: buildOutputFilename(item.file.name, item.outputFormat),
  };
}
