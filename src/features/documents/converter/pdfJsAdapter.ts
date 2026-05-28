import * as pdfjsLib from "pdfjs-dist";
import type { DocumentFormatId, ConversionRequest, ConversionResult } from "../types";
import type { DocumentConverter } from "./interface";

/**
 * pdf.js adapter: extract text from PDF documents, render as HTML/Markdown/TXT.
 * Lightweight (~1.5 MB), no WASM needed.
 */
export class PdfJsAdapter implements DocumentConverter {
  readonly name = "pdf.js";
  private workerSrcSet = false;

  canConvert(from: DocumentFormatId, to: DocumentFormatId): boolean {
    return from === "pdf" && (to === "txt" || to === "html" || to === "md");
  }

  async convert(request: ConversionRequest): Promise<ConversionResult> {
    if (!this.workerSrcSet) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://unpkg.com/pdfjs-dist@5.7.284/build/pdf.worker.min.mjs";
      this.workerSrcSet = true;
    }

    const pdf = await pdfjsLib.getDocument({ data: request.data }).promise;
    const pages: string[] = [];
    const stem = request.file.name.replace(/\.[^.]+$/, "");

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const text = content.items
        .map((item: any) => ("str" in item ? item.str : ""))
        .join(" ");
      pages.push(text);
    }

    const fullText = pages.join("\n\n---\n\n");

    if (request.outputFormat === "md") {
      const md = pages
        .map((text, i) => `## Page ${i + 1}\n\n${text}`)
        .join("\n\n---\n\n");
      return {
        blob: new Blob([md], { type: "text/markdown" }),
        mime: "text/markdown",
        filename: `${stem}.md`,
      };
    }

    if (request.outputFormat === "html") {
      const body = pages
        .map((text, i) => `<div style="margin-bottom:24px"><h2>Page ${i + 1}</h2><p>${text.replace(/\n/g, "<br>")}</p></div>`)
        .join("");
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${stem}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 800px; margin: auto; padding: 20px; line-height: 1.6; }
  h2 { color: #666; font-size: 0.9rem; text-transform: uppercase; letter-spacing: 0.04em; }
</style></head><body>${body}</body></html>`;
      return {
        blob: new Blob([html], { type: "text/html" }),
        mime: "text/html",
        filename: `${stem}.html`,
      };
    }

    return {
      blob: new Blob([fullText], { type: "text/plain" }),
      mime: "text/plain",
      filename: `${stem}.txt`,
    };
  }
}
