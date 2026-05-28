import type { FormatEntry, DocumentFormatId, ConversionEdge } from "./types";

export const FORMATS: FormatEntry[] = [
  { id: "pdf", label: "PDF", extensions: ["pdf"], mime: "application/pdf" },
  { id: "docx", label: "DOCX", extensions: ["docx"], mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" },
  { id: "doc", label: "DOC", extensions: ["doc"], mime: "application/msword" },
  { id: "odt", label: "ODT", extensions: ["odt"], mime: "application/vnd.oasis.opendocument.text" },
  { id: "rtf", label: "RTF", extensions: ["rtf"], mime: "text/rtf" },
  { id: "txt", label: "TXT", extensions: ["txt"], mime: "text/plain" },
  { id: "html", label: "HTML", extensions: ["html", "htm"], mime: "text/html" },
  { id: "md", label: "Markdown", extensions: ["md", "markdown"], mime: "text/markdown" },
  { id: "xlsx", label: "XLSX", extensions: ["xlsx"], mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  { id: "xls", label: "XLS", extensions: ["xls"], mime: "application/vnd.ms-excel" },
  { id: "csv", label: "CSV", extensions: ["csv"], mime: "text/csv" },
];

export const FORMAT_MAP: Record<string, DocumentFormatId> = {};
for (const f of FORMATS) {
  for (const ext of f.extensions) {
    FORMAT_MAP[ext] = f.id;
  }
}

/**
 * Allowed conversion pairs (v1 scope).
 * Start with high-demand edges only.
 */
/**
 * Allowed conversion pairs.
 * PDF→PDF:   pdf-lib (merge/split)
 * DOCX→*:    mammoth (HTML/TXT) + preview→PDF
 * PDF→TXT:   pdf.js
 * MD→*:      marked
 * XLSX/*:    xlsx
 */
export const ALLOWED_EDGES: ConversionEdge[] = [
  ["pdf", "pdf"],
  ["pdf", "md"],
  ["docx", "txt"],
  ["docx", "html"],
  ["docx", "pdf"],
  ["docx", "md"],
  ["pdf", "txt"],
  ["pdf", "docx"],
  ["pdf", "html"],
  ["md", "html"],
  ["md", "txt"],
  ["md", "docx"],
  ["md", "pdf"],
  ["html", "md"],
  ["txt", "md"],
  ["txt", "html"],
  ["txt", "docx"],
  ["txt", "txt"],
  ["xlsx", "html"],
  ["xlsx", "csv"],
  ["xlsx", "txt"],
  ["xlsx", "md"],
  ["xls", "html"],
  ["xls", "csv"],
  ["xls", "txt"],
  ["xls", "md"],
  ["csv", "html"],
  ["csv", "txt"],
  ["csv", "md"],
];

export function canConvert(from: DocumentFormatId, to: DocumentFormatId): boolean {
  if (from === to) return false;
  return ALLOWED_EDGES.some(([a, b]) => a === from && b === to);
}

export function detectFormat(file: File): DocumentFormatId {
  const name = file.name.toLowerCase();
  const ext = name.split(".").pop() || "";
  return FORMAT_MAP[ext] || "txt";
}

export function formatLabel(id: DocumentFormatId): string {
  return FORMATS.find((f) => f.id === id)?.label ?? id.toUpperCase();
}

export function formatMime(id: DocumentFormatId): string {
  return FORMATS.find((f) => f.id === id)?.mime ?? "application/octet-stream";
}

export function outputFormatsFor(input: DocumentFormatId): DocumentFormatId[] {
  return ALLOWED_EDGES
    .filter(([from]) => from === input)
    .map(([, to]) => to);
}

export function inputFormatsFor(output: DocumentFormatId): DocumentFormatId[] {
  return ALLOWED_EDGES
    .filter(([, to]) => to === output)
    .map(([from]) => from);
}

/** All input formats that have at least one allowed conversion */
export function allInputFormats(): DocumentFormatId[] {
  const set = new Set(ALLOWED_EDGES.map(([from]) => from));
  return Array.from(set);
}

/** All output formats available for the global selector */
export function allOutputFormats(): DocumentFormatId[] {
  return (["pdf", "docx", "html", "md", "txt", "csv"] as DocumentFormatId[]);
}
