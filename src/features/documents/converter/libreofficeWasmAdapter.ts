import type { DocumentFormatId, ConversionRequest, ConversionResult } from "../types";
import type { DocumentConverter } from "./interface";
import { getWasmState } from "./wasmLoader";

function mapFormat(id: DocumentFormatId): string {
  if (id === "docx") return "docx";
  if (id === "doc") return "doc";
  if (id === "odt") return "odt";
  if (id === "rtf") return "rtf";
  if (id === "html") return "html";
  if (id === "txt") return "txt";
  if (id === "pdf") return "pdf";
  return "txt";
}

/**
 * LibreOffice WASM adapter using shared WorkerBrowserConverter.
 * Lazy-loads the WASM (~240 MB) on first use.
 * The converter instance is pre-initialized by wasmLoader.ts.
 */
export class LibreOfficeWasmAdapter implements DocumentConverter {
  readonly name = "LibreOffice WASM";

  canConvert(from: DocumentFormatId, to: DocumentFormatId): boolean {
    if (from === to) return false;
    if (from === "pdf" && to === "pdf") return false;
    if (from === "docx" && (to === "html" || to === "txt")) return false;
    return true;
  }

  async convert(request: ConversionRequest): Promise<ConversionResult> {
    const wasmState = getWasmState();
    if (wasmState.state !== "ready") {
      throw new Error(
        "LibreOffice is still loading. Please wait for initialization to complete.",
      );
    }

    const converter = (window as any).__formatx_lo_converter;
    if (!converter) throw new Error("LibreOffice converter not found");

    const outFmt = mapFormat(request.outputFormat);
    const result = await converter.convertFile(request.file, {
      outputFormat: outFmt as any,
    });

    const stem = request.file.name.replace(/\.[^.]+$/, "");
    const ext = outFmt;
    const mime = getMime(outFmt);

    return {
      blob: new Blob([result.data], { type: mime }),
      mime,
      filename: `${stem}.${ext}`,
    };
  }
}

function getMime(fmt: string): string {
  const map: Record<string, string> = {
    pdf: "application/pdf",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    doc: "application/msword",
    odt: "application/vnd.oasis.opendocument.text",
    rtf: "text/rtf",
    html: "text/html",
    txt: "text/plain",
  };
  return map[fmt] || "application/octet-stream";
}
