import { marked } from "marked";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { DocumentFormatId, ConversionRequest, ConversionResult } from "../types";
import type { DocumentConverter } from "./interface";

const MARGIN = 50;
const FONT_SIZE = 11;
const LINE_HEIGHT = 16;
const PAGE_WIDTH = 595.28; // A4
const PAGE_HEIGHT = 841.89; // A4
const MAX_WIDTH = PAGE_WIDTH - MARGIN * 2;

/**
 * Map of common Unicode characters to ASCII equivalents for WinAnsi PDF rendering.
 */
const UNICODE_TO_ASCII: Record<string, string> = {
  "→": "->",
  "←": "<-",
  "⇒": "=>",
  "⇐": "<=",
  "↔": "<->",
  "—": "--",
  "–": "-",
  "•": "*",
  "·": "*",
  "…": "...",
  "«": '"',
  "»": '"',
  "‘": "'",
  "’": "'",
  "‚": "'",
  "‛": "'",
  "“": '"',
  "”": '"',
  "„": '"',
  "′": "'",
  "″": '"',
  "©": "(c)",
  "®": "(r)",
  "™": "(tm)",
  "°": "deg",
  "±": "+/-",
  "×": "x",
  "÷": "/",
  "≥": ">=",
  "≤": "<=",
  "≠": "!=",
  "≈": "~",
  "∞": "inf",
  "√": "sqrt",
  "∑": "sum",
  "∏": "prod",
  "∂": "d",
  "∫": "int",
  "∆": "delta",
  "∈": "in",
  "∉": "not in",
  "∋": "contains",
  "∅": "empty",
  "∧": "and",
  "∨": "or",
  "∩": "n",
  "∪": "U",
  "⊂": "subset",
  "⊃": "superset",
  "⊆": "subseteq",
  "⊇": "superseteq",
  "⊕": "(+)",
  "⊗": "(x)",
  "✓": "[x]",
  "✗": "[ ]",
  "★": "*",
  "☆": "o",
  "♪": "music",
  "♫": "music",
  "\u00A0": " ", // non-breaking space
};

/**
 * Sanitize text to only contain WinAnsi-compatible characters,
 * replacing common Unicode symbols with ASCII equivalents.
 */
function sanitizeForPdf(text: string): string {
  let result = "";
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    // WinAnsi printable range: 32-126 (basic ASCII) + 160-255 (extended)
    if (code >= 32 && code <= 126) {
      result += ch;
    } else if (code >= 160 && code <= 255) {
      result += ch;
    } else if (code === 10 || code === 13) {
      result += ch; // keep newlines
    } else if (code === 9) {
      result += " "; // tab → space
    } else if (UNICODE_TO_ASCII[ch] !== undefined) {
      result += UNICODE_TO_ASCII[ch]!;
    } else {
      result += " "; // replace unknown chars with space
    }
  }
  return result;
}

/**
 * Markdown → PDF adapter: parses markdown via marked and renders
 * text as a basic PDF document with pdf-lib.
 */
export class MarkdownToPdfAdapter implements DocumentConverter {
  readonly name = "MD->PDF";

  canConvert(from: DocumentFormatId, to: DocumentFormatId): boolean {
    return from === "md" && to === "pdf";
  }

  async convert(request: ConversionRequest): Promise<ConversionResult> {
    const text = new TextDecoder().decode(request.data);
    const stem = request.file.name.replace(/\.[^.]+$/, "");
    const htmlContent = await marked.parse(text, { async: true });

    // Strip HTML to plain text
    const plainText = htmlContent
      .replace(/<[^>]*>/g, "")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s*\n\s*\n\s*/g, "\n\n")
      .trim();

    // Sanitize for WinAnsi PDF encoding
    const safeText = sanitizeForPdf(plainText);

    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const lines = wrapText(safeText, font, FONT_SIZE, MAX_WIDTH);

    let page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

    for (const line of lines) {
      if (y < MARGIN + LINE_HEIGHT) {
        page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
      }
      page.drawText(line, {
        x: MARGIN,
        y: y - FONT_SIZE,
        size: FONT_SIZE,
        font,
        color: rgb(0, 0, 0),
      });
      y -= LINE_HEIGHT;
    }

    const pdfBytes = await pdfDoc.save();
    return {
      blob: new Blob([pdfBytes], { type: "application/pdf" }),
      mime: "application/pdf",
      filename: `${stem}.pdf`,
    };
  }
}

function wrapText(text: string, font: ReturnType<typeof Object>, fontSize: number, maxWidth: number): string[] {
  const paragraphs = text.split("\n\n");
  const result: string[] = [];
  for (const para of paragraphs) {
    const words = para.split(/\s+/);
    let line = "";
    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);
      if (width > maxWidth && line) {
        result.push(line);
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) result.push(line);
    result.push(""); // paragraph break
  }
  return result;
}
