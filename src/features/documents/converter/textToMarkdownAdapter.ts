import type { DocumentFormatId, ConversionRequest, ConversionResult } from "../types";
import type { DocumentConverter } from "./interface";
import { htmlToMarkdown, textToMarkdown } from "./htmlToMarkdown";

/**
 * Text/HTML → Markdown adapter.
 * - TXT → MD: wraps text as basic markdown
 * - HTML → MD: converts HTML to markdown via turndown
 */
export class TextToMarkdownAdapter implements DocumentConverter {
  readonly name = "text→md";

  canConvert(from: DocumentFormatId, to: DocumentFormatId): boolean {
    return to === "md" && (from === "html" || from === "txt");
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

    // TXT → MD: wrap as markdown paragraph
    const md = textToMarkdown(text);
    return {
      blob: new Blob([md], { type: "text/markdown" }),
      mime: "text/markdown",
      filename: `${stem}.md`,
    };
  }
}
