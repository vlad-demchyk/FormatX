import { marked } from "marked";
import { Document as DocxDocument, Packer, Paragraph, TextRun, Header, Footer, PageNumber } from "docx";
import type { DocumentFormatId, ConversionRequest, ConversionResult } from "../types";
import type { DocumentConverter } from "./interface";

/**
 * Markdown → DOCX adapter: parses markdown via marked and creates
 * a proper DOCX document with paragraphs and simple formatting.
 */
export class MarkdownToDocxAdapter implements DocumentConverter {
  readonly name = "MD→DOCX";

  canConvert(from: DocumentFormatId, to: DocumentFormatId): boolean {
    return from === "md" && to === "docx";
  }

  async convert(request: ConversionRequest): Promise<ConversionResult> {
    const text = new TextDecoder().decode(request.data);
    const stem = request.file.name.replace(/\.[^.]+$/, "");
    const htmlContent = await marked.parse(text, { async: true });

    // Strip HTML tags to get plain text paragraphs
    const tempDiv = htmlContent
      .replace(/<\/h[1-6]>/g, "</h1>")
      .replace(/<br\s*\/?>/g, "\n");
    const blocks = tempDiv.split(/<\/?(?:h[1-6]|p|div|li|blockquote|pre)\s*\/?>/g);
    const paragraphs: Paragraph[] = [];

    for (const block of blocks) {
      const clean = block
        .replace(/<[^>]*>/g, "")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
      if (!clean) continue;

      paragraphs.push(
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: clean,
              size: 24,
              font: "Calibri",
            }),
          ],
        }),
      );
    }

    const doc = new DocxDocument({
      title: stem,
      description: `Converted from ${request.file.name}`,
      styles: {
        default: {
          document: {
            run: { font: "Calibri", size: 24 },
          },
        },
      },
      sections: [
        {
          properties: {},
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  alignment: "right",
                  children: [
                    new TextRun({ text: stem, size: 18, color: "999999" }),
                  ],
                }),
              ],
            }),
          },
          footers: {
            default: new Footer({
              children: [
                new Paragraph({
                  alignment: "center",
                  children: [
                    new TextRun({ text: "Page ", size: 18, color: "999999" }),
                    new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "999999" }),
                  ],
                }),
              ],
            }),
          },
          children: paragraphs,
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    return {
      blob,
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      filename: `${stem}.docx`,
    };
  }
}
