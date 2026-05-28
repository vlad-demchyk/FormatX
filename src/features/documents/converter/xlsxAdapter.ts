import * as XLSX from "xlsx";
import type { DocumentFormatId, ConversionRequest, ConversionResult } from "../types";
import type { DocumentConverter } from "./interface";
import { htmlToMarkdown } from "./htmlToMarkdown";

/**
 * xlsx adapter: Excel → HTML table, CSV, TXT, Markdown.
 * Uses SheetJS (xlsx) — lightweight, no WASM.
 */
export class XlsxAdapter implements DocumentConverter {
  readonly name = "xlsx";

  canConvert(from: DocumentFormatId, to: DocumentFormatId): boolean {
    if (from !== "xlsx" && from !== "xls" && from !== "csv") return false;
    return to === "html" || to === "csv" || to === "txt" || to === "md";
  }

  async convert(request: ConversionRequest): Promise<ConversionResult> {
    const workbook = XLSX.read(request.data, { type: "array" });
    const stem = request.file.name.replace(/\.[^.]+$/, "");

    if (request.outputFormat === "csv") {
      const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[workbook.SheetNames[0]!]!);
      return {
        blob: new Blob([csv], { type: "text/csv" }),
        mime: "text/csv",
        filename: `${stem}.csv`,
      };
    }

    if (request.outputFormat === "md") {
      const rows: string[] = [];
      for (const name of workbook.SheetNames) {
        const sheet = workbook.Sheets[name]!;
        const html = XLSX.utils.sheet_to_html(sheet, { id: `sheet-${name}` });
        const md = htmlToMarkdown(html);
        rows.push(`## ${name}\n\n${md}`);
      }
      return {
        blob: new Blob([rows.join("\n\n")], { type: "text/markdown" }),
        mime: "text/markdown",
        filename: `${stem}.md`,
      };
    }

    if (request.outputFormat === "txt") {
      const rows: string[] = [];
      for (const name of workbook.SheetNames) {
        const sheet = workbook.Sheets[name]!;
        const csv = XLSX.utils.sheet_to_csv(sheet);
        rows.push(`=== ${name} ===\n${csv}`);
      }
      return {
        blob: new Blob([rows.join("\n\n")], { type: "text/plain" }),
        mime: "text/plain",
        filename: `${stem}.txt`,
      };
    }

    // HTML: render all sheets as tables
    const sheets = workbook.SheetNames.map((name) => {
      const sheet = workbook.Sheets[name]!;
      const html = XLSX.utils.sheet_to_html(sheet, { id: `sheet-${name}` });
      return `<h2>${name}</h2>${html}`;
    });

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${stem}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 1000px; margin: auto; padding: 20px; }
  table { border-collapse: collapse; width: 100%; margin-bottom: 20px; }
  th, td { border: 1px solid #ccc; padding: 6px 10px; text-align: left; font-size: 0.9rem; }
  th { background: #f0f0f0; font-weight: 600; }
</style></head><body>${sheets.join("")}</body></html>`;
    return {
      blob: new Blob([html], { type: "text/html" }),
      mime: "text/html",
      filename: `${stem}.html`,
    };
  }
}
