import { marked } from "marked";
import type { DocumentFormatId, ConversionRequest, ConversionResult } from "../types";
import type { DocumentConverter } from "./interface";

/**
 * marked adapter: Markdown → HTML with syntax highlighting.
 * Lightweight, no WASM.
 */
export class MarkedAdapter implements DocumentConverter {
  readonly name = "marked";

  canConvert(from: DocumentFormatId, to: DocumentFormatId): boolean {
    return from === "md" && (to === "html" || to === "txt");
  }

  async convert(request: ConversionRequest): Promise<ConversionResult> {
    const text = new TextDecoder().decode(request.data);
    const stem = request.file.name.replace(/\.[^.]+$/, "");

    if (request.outputFormat === "txt") {
      // Strip markdown syntax for plain text
      const plain = text
        .replace(/[#*_~`>\[\]()!\-|]/g, "")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      return {
        blob: new Blob([plain], { type: "text/plain" }),
        mime: "text/plain",
        filename: `${stem}.txt`,
      };
    }

    // HTML with formatting
    const htmlContent = await marked.parse(text, { async: true });
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${stem}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 800px; margin: auto; padding: 20px; line-height: 1.6; }
  pre { background: #f4f4f4; padding: 12px; border-radius: 8px; overflow-x: auto; }
  code { background: #f4f4f4; padding: 2px 6px; border-radius: 4px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
  img { max-width: 100%; }
</style></head><body>${htmlContent}</body></html>`;
    return {
      blob: new Blob([html], { type: "text/html" }),
      mime: "text/html",
      filename: `${stem}.html`,
    };
  }
}
