import mammoth from "mammoth";
import type { DocumentFormatId, ConversionRequest, ConversionResult } from "../types";
import type { DocumentConverter } from "./interface";
import { htmlToMarkdown } from "./htmlToMarkdown";

/**
 * mammoth adapter: DOCX → HTML, TXT, Markdown.
 * Fast, lightweight, no WASM needed.
 */
export class MammothAdapter implements DocumentConverter {
  readonly name = "mammoth";

  canConvert(from: DocumentFormatId, to: DocumentFormatId): boolean {
    return from === "docx" && (to === "html" || to === "txt" || to === "md");
  }

  async convert(request: ConversionRequest): Promise<ConversionResult> {
    const result = await mammoth.convertToHtml({ arrayBuffer: request.data });

    const stem = request.file.name.replace(/\.[^.]+$/, "");

    if (request.outputFormat === "html") {
      const html = `<!DOCTYPE html><html><meta charset="utf-8"><body>${result.value}</body></html>`;
      return {
        blob: new Blob([html], { type: "text/html" }),
        mime: "text/html",
        filename: `${stem}.html`,
      };
    }

    if (request.outputFormat === "md") {
      const md = htmlToMarkdown(result.value);
      return {
        blob: new Blob([md], { type: "text/markdown" }),
        mime: "text/markdown",
        filename: `${stem}.md`,
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
