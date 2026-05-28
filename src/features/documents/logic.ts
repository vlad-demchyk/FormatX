import { detectFormat, canConvert, formatMime, outputFormatsFor } from "./formatRegistry";
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
  if (id === "md") return "md";
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

export function createQueueItem(file: File, data: ArrayBuffer, outputFormat: DocumentFormatId): DocumentQueueItem {
  const inputFormat = detectFormat(file);
  // If the input format equals the chosen output format, pick the first
  // available alternative so we never default to input→input.
  let resolvedOutput = outputFormat;
  if (inputFormat === resolvedOutput || !canConvert(inputFormat, resolvedOutput)) {
    const alternatives = outputFormatsFor(inputFormat);
    resolvedOutput = alternatives.length > 0 ? alternatives[0]! : resolvedOutput;
  }
  return {
    id: crypto.randomUUID(),
    file,
    data,
    inputFormat,
    outputFormat: resolvedOutput,
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
