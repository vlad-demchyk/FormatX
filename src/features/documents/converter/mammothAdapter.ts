import mammoth from "mammoth";
import type { DocumentFormatId, ConversionRequest, ConversionResult } from "../types";
import type { DocumentConverter } from "./interface";

/**
 * mammoth adapter: DOCX → HTML (and TXT via stripping tags).
 * Fast, lightweight, no WASM needed.
 */
export class MammothAdapter implements DocumentConverter {
  readonly name = "mammoth";

  canConvert(from: DocumentFormatId, to: DocumentFormatId): boolean {
    return from === "docx" && (to === "html" || to === "txt");
  }

  async convert(request: ConversionRequest): Promise<ConversionResult> {
    const arrayBuffer = await request.file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });

    const stem = request.file.name.replace(/\.[^.]+$/, "");

    if (request.outputFormat === "html") {
      const html = `<!DOCTYPE html><html><meta charset="utf-8"><body>${result.value}</body></html>`;
      return {
        blob: new Blob([html], { type: "text/html" }),
        mime: "text/html",
        filename: `${stem}.html`,
      };
    }

    // TXT: strip HTML tags
    const text = result.value.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
    return {
      blob: new Blob([text], { type: "text/plain" }),
      mime: "text/plain",
      filename: `${stem}.txt`,
    };
  }
}
