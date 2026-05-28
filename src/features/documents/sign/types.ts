export type SignSourceKind = "image" | "pdf" | "docx" | "doc";

export interface SignPage {
  index: number;
  nativeWidth: number;
  nativeHeight: number;
  /** Object URL or data URL for preview display */
  previewUrl: string;
  /** Optional bitmap for export compositing */
  bitmap?: ImageBitmap;
}

export interface SignDocumentSource {
  kind: SignSourceKind;
  file: File;
  originalBytes: ArrayBuffer;
  pages: SignPage[];
  /** PDF bytes used for preview when source is doc/docx (intermediate) */
  previewPdfBytes?: ArrayBuffer;
}

/** Normalized coordinates (0–1) relative to page dimensions */
export interface PlacedSignature {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
}

export interface SignExportInput {
  source: SignDocumentSource;
  signatures: PlacedSignature[];
  signaturePng: ArrayBuffer;
}

export interface SignExportResult {
  blob: Blob;
  mime: string;
  filename: string;
}

export const SIGNATURE_KEY = "formatx-signature";

export const SIGN_ACCEPT =
  "image/*,application/pdf,.pdf,.doc,.docx,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
