import type { DocumentFormatId, ConversionRequest, ConversionResult } from "../types";
import type { DocumentConverter } from "./interface";
import { htmlToMarkdown, textToMarkdown } from "./htmlToMarkdown";
import { Document, Packer, Paragraph, TextRun } from "docx";

/**
 * Text/HTML → Markdown adapter.
 * - TXT → MD: wraps text as basic markdown
 * - TXT → HTML: wraps text in HTML
 * - TXT → DOCX: creates a basic DOCX document
 * - TXT → TXT: pass-through
 * - HTML → MD: converts HTML to markdown via turndown
 */
export class TextToMarkdownAdapter implements DocumentConverter {
  readonly name = "text→md";

  canConvert(from: DocumentFormatId, to: DocumentFormatId): boolean {
    if (from === "html" && to === "md") return true;
    if (from === "txt") return true;
    return false;
  }

  async convert(request: ConversionRequest): Promise<ConversionResult> {
    const text = new TextDecoder().decode(request.data);
    const stem = request.file.name.replace(/\.[^.]+$/, "");

    if (request.inputFormat === "html") {
      const md = htmlToMarkdown(text);
      return {
        blob: new Blob([md], { type: "text/markdown" }),
        mime: "text/markdown",
        filename: `${stem}.md`,
      };
    }

    // TXT → anything
    if (request.outputFormat === "md") {
      const md = textToMarkdown(text);
      return {
        blob: new Blob([md], { type: "text/markdown" }),
        mime: "text/markdown",
        filename: `${stem}.md`,
      };
    }

    if (request.outputFormat === "html") {
      const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${stem}</title></head><body><pre style="font-family:inherit;white-space:pre-wrap;line-height:1.6;max-width:800px;margin:auto;padding:20px">${text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre></body></html>`;
      return {
        blob: new Blob([html], { type: "text/html" }),
        mime: "text/html",
        filename: `${stem}.html`,
      };
    }

    if (request.outputFormat === "docx") {
      const paragraphs = text.split(/\n\s*\n/).map(
        (block) =>
          new Paragraph({
            spacing: { after: 200 },
            children: [new TextRun({ text: block.trim(), size: 22, font: "Calibri" })],
          }),
      );
      const doc = new Document({
        title: stem,
        sections: [{ children: paragraphs }],
      });
      const blob = await Packer.toBlob(doc);
      return {
        blob,
        mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        filename: `${stem}.docx`,
      };
    }

    if (request.outputFormat === "txt") {
      return {
        blob: new Blob([text], { type: "text/plain" }),
        mime: "text/plain",
        filename: `${stem}.txt`,
      };
    }

    throw new Error(`TXT → ${request.outputFormat.toUpperCase()} not supported`);
  }
}
