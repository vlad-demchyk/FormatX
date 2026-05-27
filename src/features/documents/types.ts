export type DocumentFormatId =
  | "pdf" | "docx" | "doc" | "odt" | "rtf" | "txt" | "html"
  | "md" | "xlsx" | "xls" | "csv";

export type DocStatus = "pending" | "converting" | "ready" | "error";

export interface DocumentQueueItem {
  id: string;
  file: File;
  inputFormat: DocumentFormatId;
  outputFormat: DocumentFormatId;
  status: DocStatus;
  error: string | null;
  blobs: Blob[] | null;
  selected: boolean;
}

export interface ConversionRequest {
  id: string;
  file: File;
  inputFormat: DocumentFormatId;
  outputFormat: DocumentFormatId;
}

export interface ConversionResult {
  blob: Blob;
  mime: string;
  filename: string;
}

export interface FormatEntry {
  id: DocumentFormatId;
  label: string;
  extensions: string[];
  mime: string;
}

export type ConversionEdge = [DocumentFormatId, DocumentFormatId];
