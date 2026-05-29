import * as pdfjsLib from "pdfjs-dist";
import { Document as DocxDocument, Packer, Paragraph, TextRun, Header, Footer, PageNumber } from "docx";
import type { DocumentFormatId, ConversionRequest, ConversionResult } from "../types";
import type { DocumentConverter } from "./interface";

/**
 * PDF → DOCX adapter: extracts text from PDF via pdf.js and creates
 * a proper DOCX document with formatting (paragraphs, headers, etc.).
 * No external server, no WASM.
 */
export class PdfToDocxAdapter implements DocumentConverter {
  readonly name = "PDF→DOCX";
  private workerSrcSet = false;

  canConvert(from: DocumentFormatId, to: DocumentFormatId): boolean {
    return from === "pdf" && to === "docx";
  }

  async convert(request: ConversionRequest): Promise<ConversionResult> {
    if (!this.workerSrcSet) {
      pdfjsLib.GlobalWorkerOptions.workerSrc = "https://unpkg.com/pdfjs-dist@3.10.111/build/pdf.worker.min.js";
      this.workerSrcSet = true;
    }

    const pdf = await pdfjsLib.getDocument({ data: request.data }).promise;
    const stem = request.file.name.replace(/\.[^.]+$/, "");

    const paragraphs: Paragraph[] = [];

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);

      // Page header
      paragraphs.push(
        new Paragraph({
          spacing: { before: 400, after: 200 },
          children: [
            new TextRun({
              text: `Page ${i}`,
              bold: true,
              size: 28,
              color: "666666",
            }),
          ],
        }),
      );

      const content = await page.getTextContent();
      let currentTexts: { str: string; fontSize?: number; bold?: boolean }[] = [];

      for (const item of content.items as any[]) {
        const str = (item.str || "").trim();
        if (!str) continue;

        // Detect potential headers (larger font, uppercase)
        const fontSize = item.fontSize || 12;
        const isBold = item.fontName?.toLowerCase().includes("bold") ?? false;

        if (str.endsWith(".") || str.endsWith(":") || str.endsWith("?")) {
          currentTexts.push({ str, fontSize, bold: isBold });
          // Flush sentence as paragraph
          const children = currentTexts.map(
            (t) =>
              new TextRun({
                text: t.str,
                bold: t.bold || t.fontSize! > 14,
                size: Math.min(Math.round((t.fontSize || 12) * 2), 48),
                font: "Calibri",
              }),
          );
          paragraphs.push(new Paragraph({ spacing: { after: 120 }, children }));
          currentTexts = [];
        } else {
          currentTexts.push({ str, fontSize, bold: isBold });
        }
      }

      // Flush remaining
      if (currentTexts.length > 0) {
        const children = currentTexts.map(
          (t) =>
            new TextRun({
              text: t.str,
              bold: t.bold || t.fontSize! > 14,
              size: Math.min(Math.round((t.fontSize || 12) * 2), 48),
              font: "Calibri",
            }),
        );
        paragraphs.push(new Paragraph({ spacing: { after: 120 }, children }));
      }

      // Page separator
      if (i < pdf.numPages) {
        paragraphs.push(
          new Paragraph({
            spacing: { before: 400 },
            children: [
              new TextRun({
                text: "─".repeat(50),
                color: "CCCCCC",
                size: 16,
              }),
            ],
          }),
        );
      }
    }

    const doc = new DocxDocument({
      title: stem,
      description: `Converted from ${request.file.name}`,
      sections: [
        {
          properties: {
            page: {
              margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
            },
          },
          headers: {
            default: new Header({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: stem, size: 16, color: "999999" }),
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
                    new TextRun({ text: "Page ", size: 16, color: "999999" }),
                    new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "999999" }),
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
