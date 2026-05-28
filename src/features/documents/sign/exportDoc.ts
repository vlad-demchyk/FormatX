import { convertDocToDocx, convertDocxToDoc } from "./libreOfficeLoader";
import { exportSignedDocx } from "./exportDocx";
import type { PlacedSignature, SignDocumentSource, SignExportResult } from "./types";
import type { LoadProgress } from "./loadDocument";

export async function exportSignedDoc(
  source: SignDocumentSource,
  signatures: PlacedSignature[],
  signaturePng: ArrayBuffer,
  onProgress?: LoadProgress,
): Promise<SignExportResult> {
  onProgress?.("Converting DOC to DOCX…", 10);
  const docxBytes = await convertDocToDocx(source.originalBytes, source.file.name, onProgress);

  const docxSource: SignDocumentSource = {
    kind: "docx",
    file: new File([docxBytes], source.file.name.replace(/\.doc$/i, ".docx"), {
      type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }),
    originalBytes: docxBytes,
    pages: source.pages,
    previewPdfBytes: source.previewPdfBytes,
  };

  onProgress?.("Embedding signature…", 60);
  const signedDocx = await exportSignedDocx(docxSource, signatures, signaturePng);

  onProgress?.("Converting back to DOC…", 80);
  const docBytes = await convertDocxToDoc(
    await signedDocx.blob.arrayBuffer(),
    signedDocx.filename,
    onProgress,
  );

  const stem = source.file.name.replace(/\.[^.]+$/, "");
  return {
    blob: new Blob([docBytes], { type: "application/msword" }),
    mime: "application/msword",
    filename: `${stem}-signed.doc`,
  };
}
