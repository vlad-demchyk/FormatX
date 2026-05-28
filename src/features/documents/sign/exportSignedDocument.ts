import { exportSignedDoc } from "./exportDoc";
import { exportSignedDocx } from "./exportDocx";
import { exportSignedImage } from "./exportImage";
import { exportSignedPdf } from "./exportPdf";
import type { LoadProgress } from "./loadDocument";
import type { SignExportInput, SignExportResult } from "./types";

export async function exportSignedDocument(
  input: SignExportInput,
  onProgress?: LoadProgress,
): Promise<SignExportResult> {
  const { source, signatures, signaturePng } = input;

  switch (source.kind) {
    case "image":
      return exportSignedImage(source, signatures, signaturePng);
    case "pdf":
      return exportSignedPdf(source, signatures, signaturePng);
    case "docx":
      return exportSignedDocx(source, signatures, signaturePng);
    case "doc":
      return exportSignedDoc(source, signatures, signaturePng, onProgress);
    default:
      throw new Error("Unsupported export type");
  }
}
